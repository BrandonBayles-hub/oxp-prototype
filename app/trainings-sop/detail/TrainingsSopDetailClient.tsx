"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Send,
  CheckCircle,
  Tag,
  Bot,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  Clock,
  Download,
  Printer,
  Shield,
  Users,
  Upload,
  ChevronDown,
  Link2,
  CalendarDays,
  Save,
  Trash2,
  Building2,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  useVault,
  COMPLIANCE_ITEMS,
  SUGGESTED_PROPERTY_TAGS,
  SUGGESTED_SUBJECT_TAGS,
  DEFAULT_VIEWER_ACCESS,
  approvalStatusDisplayLabel,
  type VaultItem,
  type DocumentHistoryEntry,
  type DocumentVersion,
  type AgentTrainingStatus,
} from "@/lib/vault-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEscalations } from "@/lib/escalations-context";
import { EscalationDetailSheet } from "@/components/escalation-detail-sheet";
import { usePermissions } from "@/lib/permissions-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TagCombobox } from "@/components/tag-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertySelector } from "@/components/property-selector";
import { getSelectedPropertyNames, getDataForView } from "@/lib/property-selector-data";
import { ViewerAccessCombobox } from "@/components/viewer-access-combobox";
import { RemovableMetadataChip } from "@/components/removable-metadata-chip";
import { CreateCustomTaskDialog } from "@/components/create-custom-task-dialog";

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false }
);

function normalizeTag(t: string): string {
  return t.trim().toLowerCase();
}

function AgentLinkCombobox({
  agents,
  linkedIds,
  onToggle,
}: {
  agents: { id: string; name: string; bucket: string; type: string }[];
  linkedIds: string[];
  onToggle: (agentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unlinked = useMemo(
    () => agents.filter((a) => !linkedIds.includes(a.id)),
    [agents, linkedIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return unlinked;
    const q = search.toLowerCase();
    return unlinked.filter(
      (a) => a.name.toLowerCase().includes(q) || a.bucket.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)
    );
  }, [unlinked, search]);

  if (unlinked.length === 0) return null;

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        + Link an agent
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                {search ? "No agents match your search" : "All agents are already linked"}
              </li>
            ) : (
              filtered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => { onToggle(a.id); }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                      {a.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{a.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{a.bucket} · {a.type}</p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-border px-2.5 py-1.5 text-[10px] text-muted-foreground">
            {unlinked.length} agent{unlinked.length === 1 ? "" : "s"} available
          </div>
        </div>
      )}
    </div>
  );
}

function ComplianceLinkCombobox({
  subjects,
  linkedSubjects,
  onLink,
  onUnlink,
}: {
  subjects: string[];
  linkedSubjects: string[];
  onLink: (subject: string) => void;
  onUnlink: (subject: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter((s) => s.toLowerCase().includes(q));
  }, [subjects, search]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          + Link compliance areas
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-[200]" align="start">
        <div className="p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search compliance areas..."
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-y-auto px-1 pb-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No areas match your search</p>
          ) : (
            filtered.map((s) => {
              const isLinked = linkedSubjects.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => isLinked ? onUnlink(s) : onLink(s)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                    isLinked && "font-medium"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", isLinked ? "text-primary" : "invisible")} />
                  <span className="truncate">{s}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RelatedDocLinkDialog({
  open,
  onOpenChange,
  fileDocuments,
  currentDocId,
  linkedIds,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileDocuments: VaultItem[];
  currentDocId: string;
  linkedIds: string[];
  onSelect: (documentId: string) => void;
}) {
  const [search, setSearch] = useState("");

  const linkable = useMemo(
    () =>
      fileDocuments.filter(
        (d) => d.type === "file" && d.id !== currentDocId && !linkedIds.includes(d.id)
      ),
    [fileDocuments, currentDocId, linkedIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return linkable;
    const q = search.toLowerCase();
    return linkable.filter(
      (d) =>
        d.fileName.toLowerCase().includes(q) ||
        (d.property?.toLowerCase().includes(q) ?? false)
    );
  }, [linkable, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link a document</DialogTitle>
          <DialogDescription>
            Select a document from your library to link it to this SOP.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2 space-y-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />

          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "No documents match your search" : "All documents are already linked"}
              </p>
            ) : (
              filtered.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{d.fileName}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.property} · {approvalStatusDisplayLabel(d.approvalStatus)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      onSelect(d.id);
                      setSearch("");
                      onOpenChange(false);
                    }}
                  >
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OwnerCombobox({ members, value, onChange }: { members: { id: string; name: string }[]; value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "mt-1 flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || "Select owner"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 z-[200]" align="start">
        <div className="p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto px-1 pb-1">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.name); setOpen(false); setQuery(""); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                value === m.name && "bg-muted font-medium"
              )}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", value === m.name ? "text-primary" : "invisible")} />
              {m.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TrainingsSopDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const {
    documents, updateDocument, approveDocument, markAgentTrained, addActivity,
    complianceSubjectDocumentIds, addComplianceSubjectDocument, removeComplianceSubjectDocument, workforceAcks, addWorkforceAck, removeWorkforceAck,
  } = useVault();
  const { agents } = useAgents();
  const { humanMembers } = useWorkforce();
  const { items: escalationItems, addEscalation } = useEscalations();
  const { hasPermission } = usePermissions();
  const doc = documents.find((d) => d.id === id && d.type === "file");
  const canEdit = hasPermission("p-training-create");

  const approvalEscalations = useMemo(
    () =>
      escalationItems.filter(
        (e) =>
          e.type === "approval" &&
          e.documentApprovalContext?.documentId === id &&
          e.status !== "Done"
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [escalationItems, id]
  );

  const [approvalSheetOpen, setApprovalSheetOpen] = useState(false);
  const [activeApprovalEscalation, setActiveApprovalEscalation] = useState<typeof approvalEscalations[number] | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(null);
  const [linkDocDialogOpen, setLinkDocDialogOpen] = useState(false);
  const createdApprovalEscalationForDocRef = useRef<string | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadChangeSummary, setUploadChangeSummary] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [dialogBody, setDialogBody] = useState("");
  const [dialogChangeSummary, setDialogChangeSummary] = useState("");
  const [dialogChangeReason, setDialogChangeReason] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerZoom, setViewerZoom] = useState(100);
  const viewerScrollRef = useRef<HTMLDivElement>(null);
  const [viewerContainerWidth, setViewerContainerWidth] = useState(0);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [ownerEdit, setOwnerEdit] = useState<string | null>(null);
  const [propertiesExpanded, setPropertiesExpanded] = useState(false);
  const [workforceExpanded, setWorkforceExpanded] = useState(false);
  const [reviewDateEdit, setReviewDateEdit] = useState("");
  const [showReviewTaskDialog, setShowReviewTaskDialog] = useState(false);

  const [inlineBody, setInlineBody] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitSummary, setSubmitSummary] = useState("");
  const [submitReason, setSubmitReason] = useState("");

  const PROPERTY_BADGE_LIMIT = 3;
  const docProperties = useMemo(
    () => (doc?.properties?.length ? doc.properties : [doc?.property ?? "Portfolio"].filter(Boolean)),
    [doc?.properties, doc?.property]
  );
  const docTags = useMemo(() => doc?.tags ?? [], [doc?.tags]);
  const docTagsNormalized = useMemo(() => new Set(docTags.map(normalizeTag)), [docTags]);
  const linkedAgents = useMemo(
    () => (doc?.linkedAgentIds ?? []).map((aid) => agents.find((a) => a.id === aid)).filter(Boolean) as typeof agents,
    [doc?.linkedAgentIds, agents]
  );

  const vaultFileDocuments = useMemo(
    () => documents.filter((d) => d.type === "file" && !d.isTemplate),
    [documents]
  );

  const relatedDocumentsResolved = useMemo(() => {
    if (!doc) return [];
    
    // Explicit links from this document
    const outboundIds = doc.relatedDocumentIds ?? [];
    
    // Implicit links to this document
    const inboundIds = documents
      .filter((d) => d.type === "file" && d.relatedDocumentIds?.includes(doc.id))
      .map((d) => d.id);
      
    // Combine and deduplicate
    const allIds = [...new Set([...outboundIds, ...inboundIds])].filter((rid) => rid !== doc.id);
    
    return allIds.map((rid) => {
      const d = documents.find((x) => x.id === rid && x.type === "file");
      return { id: rid, doc: d };
    });
  }, [doc?.id, doc?.relatedDocumentIds, documents]);
  const complianceSubjectsForDoc = useMemo(
    () => COMPLIANCE_ITEMS.filter((s) => (complianceSubjectDocumentIds[s] ?? []).includes(id ?? "")),
    [complianceSubjectDocumentIds, id]
  );
  const workforceAcksForDoc = useMemo(
    () => workforceAcks.filter((a) => complianceSubjectsForDoc.includes(a.subject)),
    [workforceAcks, complianceSubjectsForDoc]
  );
  const existingLabelsMap = useMemo(() => {
    const map = new Map<string, string>();
    const add = (label: string) => {
      const n = normalizeTag(label);
      if (!n) return;
      if (!map.has(n)) map.set(n, label.trim());
    };
    [...SUGGESTED_PROPERTY_TAGS, ...SUGGESTED_SUBJECT_TAGS, ...COMPLIANCE_ITEMS].forEach(add);
    documents.forEach((d) => (d.tags ?? []).forEach(add));
    return map;
  }, [documents]);
  const existingLabels = useMemo(() => Array.from(existingLabelsMap.values()).sort((a, b) => a.localeCompare(b)), [existingLabelsMap]);
  const availableToAdd = useMemo(
    () => existingLabels.filter((t) => !docTagsNormalized.has(normalizeTag(t))),
    [existingLabels, docTagsNormalized]
  );

  const isTextBased = !doc?.fileFormat || doc.fileFormat === "text";
  const hasDraft = Boolean(doc?.draftBody);
  const editingBody = hasDraft ? doc!.draftBody! : (doc?.body ?? "");
  const hasUnsavedChanges = isTextBased && inlineBody !== null && inlineBody !== editingBody;

  const isBodyHtml = useMemo(() => {
    const body = doc?.body ?? "";
    const t = body.trim();
    return t.startsWith("<") && t.includes("</");
  }, [doc?.body]);

  const LINES_PER_PAGE = 42;
  const viewerPages = useMemo(() => {
    const body = doc?.body ?? "";
    if (!body.trim()) return [""];
    if (isBodyHtml) return [body];
    const lines = body.split(/\n/);
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
      pages.push(lines.slice(i, i + LINES_PER_PAGE).join("\n"));
    }
    return pages.length ? pages : [""];
  }, [doc?.body, isBodyHtml]);
  const totalPages = viewerPages.length;
  const currentPageContent = viewerPages[viewerPage - 1] ?? viewerPages[0] ?? "";

  useEffect(() => {
    setViewerPage(1);
  }, [id, doc?.id]);

  // Widen the layout container for this page so the document preview has more room.
  useEffect(() => {
    const wrapper = document.querySelector<HTMLElement>(".page-content");
    if (!wrapper) return;
    const wideCls = ["!max-w-[96rem]", "lg:!px-4"];
    wrapper.classList.add(...wideCls);
    return () => wrapper.classList.remove(...wideCls);
  }, []);

  useEffect(() => {
    const el = viewerScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setViewerContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 21cm ≈ 793.7px at 96 CSS px/inch. Scale so the paper fits the container at 100% zoom.
  const PAPER_WIDTH_PX = 793.7;
  const fitScale = viewerContainerWidth > 0 ? Math.min(1, viewerContainerWidth / PAPER_WIDTH_PX) : 0.7;
  const effectiveScale = fitScale * (viewerZoom / 100);

  // When doc is in review but no open approval escalation exists (e.g. submitted from list, or non-SOP type), create one so the approval card and sheet stay available for every document type.
  useEffect(() => {
    if (!id || !doc) return;
    if (doc.approvalStatus !== "review") {
      createdApprovalEscalationForDocRef.current = null;
      return;
    }
    const hasEscalation = escalationItems.some(
      (e) =>
        e.type === "approval" &&
        e.documentApprovalContext?.documentId === id &&
        e.status !== "Done"
    );
    if (hasEscalation || createdApprovalEscalationForDocRef.current === id) return;
    createdApprovalEscalationForDocRef.current = id;
    const category = doc.documentType === "sop" ? "Compliance" : "Leasing";
    addEscalation({
      type: "approval",
      name: `Document review: ${doc.fileName}`,
      summary: "Document submitted for approval.",
      category,
      property: doc.property,
      status: "Open",
      assignee: "",
      linkToSource: `/trainings-sop/detail?id=${id}`,
      labels: [...(doc.tags ?? [])],
      documentApprovalContext: {
        documentId: id,
        documentName: doc.fileName,
        changeSummary: "Submitted for review.",
        proposedBody: doc.body ?? "",
        previousBody: "",
      },
    });
  }, [id, doc?.id, doc?.documentType, doc?.approvalStatus, doc?.fileName, doc?.property, doc?.body, escalationItems, addEscalation]);

  useEffect(() => {
    if (editDialogOpen && doc) {
      setDialogBody(doc.body ?? "");
      setEditStep(1);
      setDialogChangeSummary("");
      setDialogChangeReason("");
    }
  }, [editDialogOpen, doc?.id, doc?.body]);

  useEffect(() => {
    if (!doc) return;
    const action = searchParams.get("action");
    if (action === "edit") {
      setEditDialogOpen(true);
      router.replace(`/trainings-sop/detail?id=${id}`, { scroll: false });
    } else if (action === "upload") {
      setUploadDialogOpen(true);
      router.replace(`/trainings-sop/detail?id=${id}`, { scroll: false });
    }
  }, [doc?.id, searchParams, id, router]);

  if (!id) {
    return (
      <div className="space-y-4">
        <PageHeader title="Document" description="Invalid document." />
        <Link href="/trainings-sop" className="text-sm text-primary underline hover:no-underline">
          ← Back to Trainings & SOP
        </Link>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="space-y-4">
        <PageHeader title="Document not found" description="This document may have been removed or the link is invalid." />
        <Link href="/trainings-sop" className="text-sm text-primary underline hover:no-underline">
          ← Back to Trainings & SOP
        </Link>
      </div>
    );
  }

  const handleNameBlur = () => {
    if (nameEdit !== null && nameEdit.trim() !== doc.fileName) {
      updateDocument(id, { fileName: nameEdit.trim() || doc.fileName });
    }
    setNameEdit(null);
  };

  const handleOwnerBlur = () => {
    if (ownerEdit !== null && ownerEdit.trim() !== doc.owner) {
      updateDocument(id, { owner: ownerEdit.trim() || doc.owner });
    }
    setOwnerEdit(null);
  };

  const handleSubmitForApproval = () => {
    const summary = [dialogChangeSummary.trim(), dialogChangeReason.trim()].filter(Boolean).join(" — ") || "Document changes submitted for approval.";
    const existingHistory = doc.history ?? [];
    const submittedEntry = {
      at: new Date().toISOString(),
      action: "submitted" as const,
      by: doc.owner,
      summary,
    };
    updateDocument(id, {
      approvalStatus: "review",
      history: [...existingHistory, submittedEntry],
    });
    addEscalation({
      type: "approval",
      name: `Document review: ${doc.fileName}`,
      summary,
      category: doc.documentType === "sop" ? "Compliance" : "Leasing",
      property: doc.property,
      status: "Open",
      assignee: "",
      linkToSource: `/trainings-sop/detail?id=${id}`,
      labels: [...(doc.tags ?? [])],
      documentApprovalContext: {
        documentId: id,
        documentName: doc.fileName,
        changeSummary: summary,
        proposedBody: dialogBody,
        previousBody: doc.body ?? "",
      },
    });
    setDialogChangeSummary("");
    setEditDialogOpen(false);
  };

  const handleInlineSubmitForApproval = () => {
    if (!doc || (inlineBody === null && !hasDraft)) return;
    const summary = [submitSummary.trim(), submitReason.trim()].filter(Boolean).join(" — ") || "Document changes submitted for approval.";
    const existingHistory = doc.history ?? [];
    const submittedEntry = {
      at: new Date().toISOString(),
      action: "submitted" as const,
      by: doc.owner,
      summary,
    };
    const bodyToSubmit = inlineBody ?? doc.draftBody ?? doc.body ?? "";
    updateDocument(id, {
      body: bodyToSubmit,
      draftBody: undefined,
      approvalStatus: "review",
      history: [...existingHistory, submittedEntry],
    });
    addEscalation({
      type: "approval",
      name: `Document review: ${doc.fileName}`,
      summary,
      category: doc.documentType === "sop" ? "Compliance" : "Leasing",
      property: doc.property,
      status: "Open",
      assignee: "",
      linkToSource: `/trainings-sop/detail?id=${id}`,
      labels: [...(doc.tags ?? [])],
      documentApprovalContext: {
        documentId: id,
        documentName: doc.fileName,
        changeSummary: summary,
        proposedBody: bodyToSubmit,
        previousBody: doc.body ?? "",
      },
    });
    setInlineBody(null);
    setSubmitSummary("");
    setSubmitReason("");
    setSubmitDialogOpen(false);
  };

  const handleSaveDraft = () => {
    if (!doc || inlineBody === null) return;
    updateDocument(id, { draftBody: inlineBody });
    setInlineBody(null);
    addActivity({
      action: "Draft saved",
      by: doc.owner,
      documentId: id,
      documentName: doc.fileName,
      detail: "Document draft saved for later editing.",
    });
  };

  const handleDiscardDraft = () => {
    if (!doc) return;
    updateDocument(id, { draftBody: undefined });
    setInlineBody(null);
    addActivity({
      action: "Draft discarded",
      by: doc.owner,
      documentId: id,
      documentName: doc.fileName,
      detail: "Document draft discarded; reverted to last approved version.",
    });
  };

  const handleUploadNewVersion = () => {
    if (!uploadFile) return;
    const summary = uploadChangeSummary.trim() || `Uploaded new file: ${uploadFile.name}`;
    const existingHistory = doc.history ?? [];
    const currentVersion = doc.version ?? "1.0";

    const currentVersionSnapshot: DocumentVersion = {
      version: currentVersion,
      body: doc.body ?? "",
      approvedAt: new Date().toISOString(),
      approvedBy: doc.owner,
      changeSummary: `Snapshot before upload of ${uploadFile.name}`,
    };
    const existingVersions = doc.versions ?? [];

    const parts = currentVersion.split(".");
    const nextVersion = `${parseInt(parts[0], 10) + 1}.0`;

    const submittedEntry: DocumentHistoryEntry = {
      at: new Date().toISOString(),
      action: "submitted" as const,
      by: doc.owner,
      summary: `New version uploaded (${uploadFile.name}). ${summary}`,
    };

    updateDocument(id, {
      approvalStatus: "review",
      version: nextVersion,
      history: [...existingHistory, submittedEntry],
      versions: [...existingVersions, currentVersionSnapshot],
      modified: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });

    addEscalation({
      type: "approval",
      name: `Document review: ${doc.fileName} v${nextVersion}`,
      summary: `New version uploaded (${uploadFile.name}). ${summary}`,
      category: doc.documentType === "sop" ? "Compliance" : "Leasing",
      property: doc.property,
      status: "Open",
      assignee: "",
      linkToSource: `/trainings-sop/detail?id=${id}`,
      labels: [...(doc.tags ?? [])],
      documentApprovalContext: {
        documentId: id,
        documentName: doc.fileName,
        changeSummary: `New version uploaded (${uploadFile.name}). ${summary}`,
        proposedBody: doc.body ?? "",
        previousBody: doc.body ?? "",
      },
    });

    addActivity({
      action: "New version uploaded",
      by: doc.owner,
      documentId: id,
      documentName: doc.fileName,
      detail: `Uploaded ${uploadFile.name} as v${nextVersion}. Submitted for approval.`,
    });

    setUploadFile(null);
    setUploadChangeSummary("");
    setUploadDialogOpen(false);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/trainings-sop/detail?id=${id}` : "";
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      if (typeof window !== "undefined") window.prompt("Copy this link:", shareUrl);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const n = normalizeTag(trimmed);
    if (docTagsNormalized.has(n)) return;
    const canonical = existingLabelsMap.get(n) ?? trimmed;
    const next = [...(doc.tags ?? []), canonical].filter(Boolean);
    updateDocument(id, { tags: next });
    
    addActivity({
      action: "Label added",
      by: "Admin",
      documentId: id,
      documentName: doc.fileName,
      detail: `Added label "${canonical}"`,
    });
  };

  const removeTag = (tag: string) => {
    updateDocument(id, { tags: (doc.tags ?? []).filter((t) => t !== tag) });
    
    addActivity({
      action: "Label removed",
      by: "Admin",
      documentId: id,
      documentName: doc.fileName,
      detail: `Removed label "${tag}"`,
    });
  };

  const toggleAgent = (agentId: string) => {
    const current = doc.linkedAgentIds ?? [];
    const next = current.includes(agentId) ? current.filter((x) => x !== agentId) : [...current, agentId];
    updateDocument(id, { linkedAgentIds: next });
  };

  const toggleRelatedDocument = (otherId: string) => {
    const isOutbound = doc.relatedDocumentIds?.includes(otherId);
    const otherDoc = documents.find((d) => d.id === otherId);
    const isInbound = otherDoc?.relatedDocumentIds?.includes(id);

    let actionText = "";

    if (isOutbound) {
      const next = doc.relatedDocumentIds!.filter((x) => x !== otherId);
      updateDocument(id, { relatedDocumentIds: next.length ? next : undefined });
      actionText = `Unlinked "${otherDoc?.fileName || otherId}"`;
    }
    if (isInbound && otherDoc) {
      const next = otherDoc.relatedDocumentIds!.filter((x) => x !== id);
      updateDocument(otherId, { relatedDocumentIds: next.length ? next : undefined });
      actionText = `Removed inbound link from "${otherDoc.fileName}"`;
    }
    
    if (!isOutbound && !isInbound) {
      const next = [...(doc.relatedDocumentIds ?? []), otherId];
      updateDocument(id, { relatedDocumentIds: next });
      actionText = `Linked to "${otherDoc?.fileName || otherId}"`;
    }

    if (actionText) {
      addActivity({
        action: "Connection updated",
        by: "Admin",
        documentId: id,
        documentName: doc.fileName,
        detail: actionText,
      });
    }
  };

  const displayTitle = nameEdit !== null ? nameEdit : doc.fileName;
  const displayBody = hasDraft ? doc.draftBody! : (doc.body ?? "");

  return (
    <>
      <header className="page-header">
        <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={doc.folderId ? `/trainings-sop?folder=${doc.folderId}` : "/trainings-sop"}
            className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back to Trainings & SOP"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {nameEdit !== null ? (
            <input
              type="text"
              value={nameEdit}
              onChange={(e) => setNameEdit(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
              className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent font-heading text-2xl font-medium leading-tight tracking-tight text-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Document name"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNameEdit(doc.fileName)}
              className="min-w-0 truncate text-left font-heading text-2xl font-medium leading-tight tracking-tight text-foreground hover:text-muted-foreground"
            >
              {doc.fileName}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setHistoryDialogOpen(true)}
            aria-label="View document history"
            title="History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Share2 className="h-4 w-4" />
            {shareCopied ? "Link copied" : "Share"}
          </Button>
          {isTextBased ? (
            canEdit && (hasUnsavedChanges || hasDraft) && (
              <>
                {hasUnsavedChanges && (
                  <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                )}
                <Button size="sm" onClick={() => setSubmitDialogOpen(true)}>
                  <Send className="h-4 w-4" />
                  Submit for Approval
                </Button>
              </>
            )
          ) : (
            <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload New Version
            </Button>
          )}
        </div>
        </div>
      </header>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Document history
            </DialogTitle>
            <DialogDescription>
              Changes, submissions, and approval results with reviewer notes.
            </DialogDescription>
          </DialogHeader>
          {(doc.history?.length ?? 0) > 0 ? (
            <ul className="space-y-3 text-sm">
              {[...(doc.history ?? [])].reverse().map((entry: DocumentHistoryEntry, idx: number) => (
                <li key={`${entry.at}-${idx}`} className="rounded-md border border-border/60 bg-muted/30 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        entry.action === "approved"
                          ? "bg-primary/15 text-primary"
                          : entry.action === "denied"
                            ? "bg-destructive/15 text-destructive"
                            : entry.action === "submitted"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {entry.action}
                    </span>
                    {entry.by && (
                      <span className="text-xs text-muted-foreground">by {entry.by}</span>
                    )}
                  </div>
                  {(entry.note || entry.summary) && (
                    <p className="mt-1.5 text-xs text-foreground">
                      {entry.note ?? entry.summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No history yet. Submissions and approvals will appear here.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      <Dialog open={versionsDialogOpen} onOpenChange={(v) => { setVersionsDialogOpen(v); if (!v) setSelectedVersionIdx(null); }}>
        <DialogContent className="max-h-[85vh] sm:max-w-4xl flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          {(doc.versions?.length ?? 0) > 0 ? (
            <div className="flex flex-1 min-h-0 gap-4">
              {/* Version list */}
              <div className="w-64 shrink-0 overflow-y-auto space-y-1.5 pr-2 border-r border-border">
                {/* Current version */}
                <button
                  type="button"
                  onClick={() => setSelectedVersionIdx(-1)}
                  className={cn(
                    "w-full rounded-md border p-2.5 text-left transition-colors hover:bg-muted/50",
                    selectedVersionIdx === -1 ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">v{doc.version ?? "1.0"}</span>
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Current</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{doc.modified}</p>
                </button>
                {/* Previous versions */}
                {[...(doc.versions ?? [])].reverse().map((v, idx) => (
                  <button
                    key={`${v.version}-${idx}`}
                    type="button"
                    onClick={() => setSelectedVersionIdx(idx)}
                    className={cn(
                      "w-full rounded-md border p-2.5 text-left transition-colors hover:bg-muted/50",
                      selectedVersionIdx === idx ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">v{v.version}</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(v.approvedAt).toLocaleDateString()}</span>
                    </div>
                    {v.approvedBy && <p className="text-[11px] text-muted-foreground">By {v.approvedBy}</p>}
                    {v.changeSummary && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{v.changeSummary}</p>}
                  </button>
                ))}
              </div>
              {/* Content preview */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {selectedVersionIdx === -1 ? (
                  <>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">v{doc.version ?? "1.0"} — Current version</p>
                        <p className="text-xs text-muted-foreground">{doc.modified}</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/10 p-4">
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: (() => { const b = doc.body ?? ""; return b.startsWith("<") ? b : `<pre class="whitespace-pre-wrap">${b}</pre>`; })() }}
                      />
                    </div>
                  </>
                ) : selectedVersionIdx !== null ? (() => {
                  const versions = [...(doc.versions ?? [])].reverse();
                  const v = versions[selectedVersionIdx];
                  if (!v) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                        <div>
                          <p className="text-sm font-semibold text-foreground">v{v.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(v.approvedAt).toLocaleDateString()}
                            {v.approvedBy && ` · Approved by ${v.approvedBy}`}
                          </p>
                          {v.changeSummary && <p className="mt-0.5 text-xs text-muted-foreground">{v.changeSummary}</p>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => {
                            if (v.body) {
                              updateDocument(id, { body: v.body, version: v.version });
                              setVersionsDialogOpen(false);
                              setSelectedVersionIdx(null);
                            }
                          }}
                        >
                          <History className="h-3 w-3" /> Restore this version
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/10 p-4">
                        {v.body ? (
                          <div
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: v.body.startsWith("<") ? v.body : `<pre class="whitespace-pre-wrap">${v.body}</pre>` }}
                          />
                        ) : (
                          <p className="py-8 text-center text-sm text-muted-foreground">No content snapshot available for this version.</p>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <History className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">Select a version</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs">Click any version on the left to preview its content and compare with the current document.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No previous versions. Versions are created each time a document is approved.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditStep(1); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editStep === 1 ? "Edit document" : "Describe changes & submit"}</DialogTitle>
            <DialogDescription>
              {editStep === 1
                ? "Step 1: Update the document content below. Use the toolbar for bold, lists, and more. Click Next to describe your changes."
                : "Step 2: Summarize what changed and why. Save and close = keep your edits only. Submit for approval = send to the escalation queue."}
            </DialogDescription>
          </DialogHeader>

          {editStep === 1 ? (
            <div className="space-y-4 py-2">
              <div className="min-h-[280px]">
                <label className="mb-1 block text-xs font-medium text-foreground">Document content</label>
                {editDialogOpen && (
                  <RichTextEditor
                    key={`edit-body-${id}-${editDialogOpen}`}
                    value={dialogBody}
                    onChange={setDialogBody}
                    placeholder="Document content…"
                    minHeight="260px"
                    contentKey={id}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">What was updated?</label>
                <textarea
                  value={dialogChangeSummary}
                  onChange={(e) => setDialogChangeSummary(e.target.value)}
                  placeholder="Summarize the changes (e.g. Updated late fee section, added move-out checklist)"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">Why were these changes made?</label>
                <textarea
                  value={dialogChangeReason}
                  onChange={(e) => setDialogChangeReason(e.target.value)}
                  placeholder="Explain the reason (e.g. Policy change from regional, resident request, compliance update)"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {editStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                {doc.documentType === "sop" ? (
                  <Button onClick={() => setEditStep(2)}>Next: Describe changes</Button>
                ) : (
                  <Button onClick={() => { updateDocument(id, { body: dialogBody }); setEditDialogOpen(false); }}>Save</Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditStep(1)}>Back</Button>
                <Button variant="outline" onClick={() => { updateDocument(id, { body: dialogBody }); setEditDialogOpen(false); }}>
                  Save and close
                </Button>
                {doc.documentType === "sop" && (
                  <Button onClick={handleSubmitForApproval}>
                    <Send className="h-4 w-4" />
                    Submit for approval
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) { setUploadFile(null); setUploadChangeSummary(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new file or import from a connected source. This will create a new approval request for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">File</label>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xlsx,.xls,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <div
                onClick={() => uploadInputRef.current?.click()}
                className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadFile(null); if (uploadInputRef.current) uploadInputRef.current.value = ""; }}
                      className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">Click to select a file</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">PDF, DOCX, TXT, and other document formats</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Or import from</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setUploadDialogOpen(false); router.push("/trainings-sop?connect=google-drive"); }} className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/><path d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/></svg>
                  <span className="text-xs font-medium text-foreground">Google Drive</span>
                </button>
                <button type="button" onClick={() => { setUploadDialogOpen(false); router.push("/trainings-sop?connect=ms-teams"); }} className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" fill="none"><path d="M1 1h10v10H1z" fill="#F25022"/><path d="M12 1h10v10H12z" fill="#7FBA00"/><path d="M1 12h10v10H1z" fill="#00A4EF"/><path d="M12 12h10v10H12z" fill="#FFB900"/></svg>
                  <span className="text-xs font-medium text-foreground">Microsoft 365</span>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">What changed in this version?</label>
              <textarea
                value={uploadChangeSummary}
                onChange={(e) => setUploadChangeSummary(e.target.value)}
                placeholder="Describe what's different (e.g. Updated late fee schedule, revised move-out procedures)"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadNewVersion} disabled={!uploadFile}>
              <Send className="h-4 w-4" />
              Upload &amp; Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Left: Document details */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-semibold text-foreground">SOP Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/50 text-sm [&>div]:py-4 first:[&>div]:pt-0 last:[&>div]:pb-0">
              <div>
                <label className="text-muted-foreground">Document name</label>
                <input
                  type="text"
                  value={nameEdit !== null ? nameEdit : doc.fileName}
                  onChange={(e) => setNameEdit(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground"
                  placeholder="Document name"
                  aria-label="Document name"
                />
              </div>
              <div>
                <label className="text-muted-foreground">Scope</label>
                <select
                  value={doc.scopeLevel || "company"}
                  onChange={(e) => updateDocument(id, { scopeLevel: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium capitalize"
                  aria-label="Document scope"
                >
                  <option value="company">Company</option>
                  <option value="owner">Owner</option>
                  <option value="property">Property</option>
                </select>
                {doc.scopeLevel === "owner" && (
                  <select
                    value={doc.ownerId || ""}
                    onChange={(e) => updateDocument(id, { ownerId: e.target.value })}
                    className="mt-2 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground"
                    aria-label="Select Owner"
                  >
                    <option value="" disabled>Select an owner...</option>
                    <option value="Smith Investments">Smith Investments</option>
                    <option value="Jones Portfolio">Jones Portfolio</option>
                    <option value="Capital Group">Capital Group</option>
                  </select>
                )}
              </div>
              {(!doc.scopeLevel || doc.scopeLevel === "property") && (
                <div>
                  <label className="text-muted-foreground">Property</label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {(propertiesExpanded ? docProperties : docProperties.slice(0, PROPERTY_BADGE_LIMIT)).map((p) => (
                      <RemovableMetadataChip
                        key={p}
                        removeLabel={`Remove ${p}`}
                        onRemove={() => {
                          const next = docProperties.filter((x) => x !== p);
                          const primary = next[0] ?? "Portfolio";
                          updateDocument(id, { properties: next.length ? next : undefined, property: primary });
                        }}
                      >
                        {p}
                      </RemovableMetadataChip>
                    ))}
                  </div>
                  {docProperties.length > PROPERTY_BADGE_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setPropertiesExpanded((e) => !e)}
                      className="mt-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {propertiesExpanded ? "See less" : `See more (${docProperties.length - PROPERTY_BADGE_LIMIT} more)`}
                    </button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="mt-1.5 flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        aria-label="Add property"
                      >
                        <span className="text-muted-foreground">Add property…</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
                      <PropertySelector
                        className="h-[400px] border-0 shadow-none rounded-md"
                        onSelectionChange={(selectedIds) => {
                          const names = getSelectedPropertyNames(getDataForView("Property List"), selectedIds);
                          if (names.length > 0) {
                            const merged = [...new Set([...docProperties, ...names])];
                            updateDocument(id, { properties: merged, property: merged[0] });
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div>
                <label className="text-muted-foreground">Viewers</label>
                <div className="mt-1.5">
                  <ViewerAccessCombobox
                    value={(doc.viewerAccess ?? DEFAULT_VIEWER_ACCESS).entries}
                    onChange={(entries) =>
                      updateDocument(id, { viewerAccess: { entries: [...new Set(entries)] } })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Approval</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.approvalStatus === "approved"
                        ? "bg-[#B3FFCC] text-black dark:bg-emerald-900/40 dark:text-emerald-300"
                        : doc.approvalStatus === "review" || doc.approvalStatus === "needs_review"
                          ? "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {approvalStatusDisplayLabel(doc.approvalStatus)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-3 w-3" />
                    Upload New Version
                  </Button>
                </div>
              </div>
              {approvalEscalations.length > 0 && (
                <div className="space-y-2">
                  {approvalEscalations.map((esc) => (
                    <div
                      key={esc.id}
                      className="cursor-pointer rounded-md border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setActiveApprovalEscalation(esc); setApprovalSheetOpen(true); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveApprovalEscalation(esc);
                          setApprovalSheetOpen(true);
                        }
                      }}
                      aria-label="Open approval review"
                    >
                      <p className="text-sm font-semibold text-foreground">Approval review</p>
                      <p className="mt-0.5 text-xs font-medium text-foreground">
                        {esc.documentApprovalContext?.documentName ?? doc.fileName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {esc.documentApprovalContext?.changeSummary ||
                          esc.summary ||
                          "No description provided"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        Submitted {new Date(esc.createdAt).toLocaleDateString()}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary">
                        View Approval
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div><span className="text-muted-foreground">Version</span><p className="font-medium">{doc.version ?? "1.0"}</p></div>
                {(doc.versions?.length ?? 0) > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setVersionsDialogOpen(true)}>
                    View history ({doc.versions!.length})
                  </Button>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Next review date</span>
                <div className="mt-1">
                  {doc.nextReviewDate ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReviewTaskDialog(true)}
                        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                        title="Click to edit review date"
                      >
                        <CalendarDays className="h-4 w-4 opacity-70" />
                        {doc.nextReviewDate}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => updateDocument(id, { nextReviewDate: "" })}
                        aria-label="Clear review date"
                        title="Clear review date"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setShowReviewTaskDialog(true)}
                    >
                      <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                      Schedule Review
                    </Button>
                  )}
                </div>
              </div>
              <div><span className="text-muted-foreground">Modified</span><p className="font-medium">{doc.modified}</p></div>
              <div>
                <label className="text-muted-foreground">Owner</label>
                <OwnerCombobox
                  members={humanMembers}
                  value={doc.owner}
                  onChange={(name) => updateDocument(id, { owner: name })}
                />
              </div>
              <div><span className="text-muted-foreground">Source</span><p className="font-medium">{doc.source ?? "upload"}</p></div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-semibold text-foreground">Connections</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/50 text-sm [&>div]:py-4 first:[&>div]:pt-0 last:[&>div]:pb-0">
              {/* ── Related documents ── */}
              <div>
                <span className="text-muted-foreground">Related documents</span>
                <div className="mt-0.5">
                  <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
                    Cross-references for change control: when this document is updated, linked SOPs and policies may need a review too.
                  </p>
                  {relatedDocumentsResolved.length > 0 ? (
                    <ul className="space-y-1.5 mb-2">
                      {relatedDocumentsResolved.map(({ id: rid, doc: rd }) => (
                        <li
                          key={rid}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/50 px-2.5 py-1.5"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {rd ? (
                              <Link
                                href={`/trainings-sop/detail?id=${rd.id}`}
                                className="truncate text-sm font-medium text-foreground hover:underline"
                              >
                                {rd.fileName}
                              </Link>
                            ) : (
                              <span className="truncate text-sm text-muted-foreground italic">Removed or missing document</span>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => toggleRelatedDocument(rid)}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={rd ? `Unlink ${rd.fileName}` : "Remove link"}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground mb-2">
                      No related documents yet. Link others this SOP references or depends on.
                    </p>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => setLinkDocDialogOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        + Link a document
                      </button>
                      <RelatedDocLinkDialog
                        open={linkDocDialogOpen}
                        onOpenChange={setLinkDocDialogOpen}
                        fileDocuments={vaultFileDocuments}
                        currentDocId={id}
                        linkedIds={relatedDocumentsResolved.map(r => r.id)}
                        onSelect={toggleRelatedDocument}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* ── Compliance ── */}
              <div>
                <span className="text-muted-foreground">Compliance</span>
                <div className="mt-1.5">
                  {complianceSubjectsForDoc.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {complianceSubjectsForDoc.map((subject) => (
                        <RemovableMetadataChip
                          key={subject}
                          removeLabel={`Unlink ${subject}`}
                          onRemove={canEdit ? () => removeComplianceSubjectDocument(subject, id ?? "") : undefined}
                        >
                          {subject}
                        </RemovableMetadataChip>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground mb-2">
                      Not linked to a compliance area yet.
                    </p>
                  )}
                  {canEdit && (
                    <ComplianceLinkCombobox
                      subjects={COMPLIANCE_ITEMS}
                      linkedSubjects={complianceSubjectsForDoc}
                      onLink={(subject) => addComplianceSubjectDocument(subject, id ?? "")}
                      onUnlink={(subject) => removeComplianceSubjectDocument(subject, id ?? "")}
                    />
                  )}
                </div>
              </div>

              {/* ── AI Agents ── */}
              <div>
                <span className="text-muted-foreground">AI Agents</span>
                <div className="mt-0.5">
                  {linkedAgents.length > 0 ? (
                    <ul className="space-y-1.5">
                      {linkedAgents.map((a) => {
                        const record = doc.trainingRecords?.find((r) => r.agentId === a.id);
                        const status: AgentTrainingStatus = record?.status ?? "pending";
                        const statusLabel = status === "trained" ? "Trained" : status === "out_of_date" ? "Out of date" : "Pending";
                        const statusCls = status === "trained"
                          ? "bg-[#B3FFCC] text-black dark:bg-emerald-900/40 dark:text-emerald-300"
                          : status === "out_of_date"
                            ? "bg-amber-400 text-amber-950 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-muted text-muted-foreground";
                        return (
                          <li key={a.id} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/50 px-2.5 py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                {a.name.slice(0, 1)}
                              </span>
                              <Link href={`/agent-roster?agent=${a.id}`} className="truncate text-sm font-medium text-foreground hover:underline">{a.name}</Link>
                              <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>{statusLabel}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {status !== "trained" && (
                                <Button
                                  variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                                  onClick={() => {
                                    markAgentTrained(id, a.id);
                                    addActivity({ action: "Agent trained", by: "Admin", documentId: id, documentName: doc.fileName, detail: `${a.name} marked as trained on v${doc.version ?? "1.0"}` });
                                  }}
                                >
                                  Train
                                </Button>
                              )}
                              <button type="button" onClick={() => toggleAgent(a.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Unlink ${a.name}`}>
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
                      No agents linked to this document yet.
                    </p>
                  )}
                  <AgentLinkCombobox
                    agents={agents}
                    linkedIds={doc.linkedAgentIds ?? []}
                    onToggle={toggleAgent}
                  />
                </div>
              </div>

              
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-semibold text-foreground">
                Labels
              </CardTitle>
              <CardDescription>
                Labels are used as metadata to help AI agents search and relate documents to escalations.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col">
              {docTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {docTags.map((t) => (
                    <RemovableMetadataChip
                      key={t}
                      removeLabel={`Remove ${t}`}
                      onRemove={() => removeTag(t)}
                    >
                      {t}
                    </RemovableMetadataChip>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground mb-3">
                  No labels yet. Add labels below to drive routing and agent connections.
                </p>
              )}

              <div>
                <TagCombobox
                  existingLabels={availableToAdd}
                  onAdd={addTag}
                />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right: Document view/edit panel */}
        <div className="min-h-[480px] lg:sticky lg:top-6 flex flex-col rounded-lg border border-border/60 bg-card overflow-hidden lg:max-h-[calc(100vh-6rem)]">

          {isTextBased ? (
            <>
              {/* ── Text-based: Inline TipTap editor ── */}
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">{displayTitle || "Untitled"}</span>
                  {!canEdit && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Read only</Badge>
                  )}
                  {hasDraft && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">Draft</Badge>
                  )}
                  {hasUnsavedChanges && (
                    <span className="flex h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasDraft && canEdit && (
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      title="Discard draft and revert to last approved version"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Discard Draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (typeof window !== "undefined") window.print(); }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Print"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {displayBody?.trim() || canEdit ? (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <RichTextEditor
                    key={`inline-${id}-${hasDraft ? "draft" : "live"}`}
                    value={displayBody}
                    onChange={(html) => {
                      if (canEdit) setInlineBody(html);
                    }}
                    placeholder={canEdit ? "Start writing your document…" : "No content yet."}
                    minHeight="400px"
                    className="flex-1 min-h-0"
                    contentKey={`${id}-${hasDraft ? "draft" : "live"}`}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-muted/30">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No content yet</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">This document has no text content.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ── Binary (PDF/DOCX): Paper preview with zoom/pagination ── */}
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">{displayTitle || "Untitled"}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{doc.fileFormat ?? "PDF"}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewerZoom((z) => Math.max(60, z - 10))}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums text-muted-foreground">{viewerZoom}%</span>
                  <button
                    type="button"
                    onClick={() => setViewerZoom((z) => Math.min(150, z + 10))}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => { if (typeof window !== "undefined") window.print(); }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Print"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-3.5 w-3.5" />
                    Upload New Version
                  </Button>
                </div>
              </div>

              {displayBody?.trim() ? (
                <>
                  <div
                    ref={viewerScrollRef}
                    className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
                    style={{ backgroundColor: "hsl(var(--muted))", backgroundImage: "radial-gradient(circle, hsl(var(--border)) 0.5px, transparent 0.5px)", backgroundSize: "16px 16px" }}
                  >
                    <div
                      className="mx-auto"
                      style={{
                        width: `calc(21cm * ${effectiveScale})`,
                        minHeight: `calc(29.7cm * ${effectiveScale})`,
                      }}
                    >
                      <div
                        className="bg-card shadow-lg rounded border border-border/40 origin-top-left"
                        style={{
                          width: "21cm",
                          minHeight: "29.7cm",
                          transform: `scale(${effectiveScale})`,
                        }}
                      >
                        <div className="border-b border-border/40 bg-muted/20 px-8 py-5 sm:px-10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h2 className="font-heading text-xl font-semibold text-foreground leading-tight">
                                {displayTitle || "Untitled"}
                              </h2>
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>{doc.property}</span>
                                {doc.version && <span>v{doc.version}</span>}
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{doc.modified}</span>
                                {doc.effectiveDate && <span>Effective {doc.effectiveDate}</span>}
                              </div>
                            </div>
                            {doc.owner && (
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {doc.owner.slice(0, 1).toUpperCase()}
                                </span>
                                <span className="text-xs text-muted-foreground hidden sm:inline">{doc.owner}</span>
                              </div>
                            )}
                          </div>
                          {docTags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {docTags.map((t) => (
                                <span key={t} className="inline-flex rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/15">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="px-8 py-6 sm:px-10 sm:py-8">
                          <div
                            className={cn(
                              "font-sans text-foreground leading-relaxed selection:bg-primary/20",
                              "prose prose-sm max-w-none dark:prose-invert",
                              "prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight",
                              "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
                              "prose-strong:text-foreground",
                              isBodyHtml ? "prose-p:first:mt-0" : "whitespace-pre-wrap font-mono text-[13px]"
                            )}
                            style={{
                              fontSize: isBodyHtml ? "14px" : "13px",
                              lineHeight: isBodyHtml ? 1.7 : 1.6,
                              letterSpacing: isBodyHtml ? "0.01em" : undefined,
                            }}
                            {...(isBodyHtml ? { dangerouslySetInnerHTML: { __html: currentPageContent } } : {})}
                          >
                            {!isBodyHtml ? currentPageContent : null}
                          </div>
                        </div>

                        <div className="border-t border-border/30 bg-muted/10 px-8 py-3 sm:px-10">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Page {viewerPage} of {totalPages}</span>
                            <span>{doc.source === "entrata" ? "Source: Entrata" : "Source: Uploaded"} · {doc.fileName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 border-t border-border bg-card px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setViewerPage((p) => Math.max(1, p - 1))}
                        disabled={viewerPage <= 1}
                        className="rounded p-1.5 text-foreground/70 hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setViewerPage(page)}
                              className={cn(
                                "h-7 min-w-[1.75rem] rounded px-1.5 text-xs font-medium transition-colors",
                                viewerPage === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {page}
                            </button>
                          );
                        })}
                        {totalPages > 7 && <span className="text-xs text-muted-foreground px-1">...</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewerPage((p) => Math.min(totalPages, p + 1))}
                        disabled={viewerPage >= totalPages}
                        className="rounded p-1.5 text-foreground/70 hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 bg-muted/30">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No content yet</p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">Upload a document to populate the preview.</p>
                  <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="h-3.5 w-3.5" /> Upload Document
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Submit for Approval dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Submit for Approval
            </DialogTitle>
            <DialogDescription>
              Describe what changed and why. This will be sent to the approval queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">What was updated?</label>
              <textarea
                value={submitSummary}
                onChange={(e) => setSubmitSummary(e.target.value)}
                placeholder="e.g. Updated late fee section, added move-out checklist"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Why were these changes made?</label>
              <textarea
                value={submitReason}
                onChange={(e) => setSubmitReason(e.target.value)}
                placeholder="e.g. Policy change from regional, compliance update"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInlineSubmitForApproval}>
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <CreateCustomTaskDialog
        open={showReviewTaskDialog}
        onOpenChange={setShowReviewTaskDialog}
        mode="specialty"
        title="Schedule Review"
        allowAbsoluteDate
        saveButtonText="Schedule Review"
        initialData={{
          id: `review-${doc?.id}`,
          name: `Review: ${doc?.fileName || "Document"}`,
          description: "Scheduled document review.",
          workflow: "Trainings & SOP",
          source: "custom",
          repeats: "Never",
          priority: "P2",
          assignee: "",
          property: doc?.property || "Portfolio",
          dueIn: doc?.nextReviewDate || new Date().toISOString().split("T")[0],
        } as any}
        onSave={(task) => {
          console.log("Scheduled review task:", task);
          let nextDateStr = task.dueIn;
          
          // If task.dueIn isn't an absolute date (e.g. they chose to repeat Monthly), fallback to calculating an offset
          if (!nextDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const nextDate = new Date();
            if (task.repeats === "Monthly") {
               nextDate.setMonth(nextDate.getMonth() + 1);
            } else if (task.repeats === "Quarterly") {
               nextDate.setMonth(nextDate.getMonth() + 3);
            } else if (task.repeats === "Semi-Annually") {
               nextDate.setMonth(nextDate.getMonth() + 6);
            } else if (task.repeats === "Annually") {
               nextDate.setFullYear(nextDate.getFullYear() + 1);
            } else {
               nextDate.setMonth(nextDate.getMonth() + 6);
            }
            nextDateStr = nextDate.toISOString().split("T")[0];
          }

          updateDocument(id, { nextReviewDate: nextDateStr });
          setShowReviewTaskDialog(false);
        }}
      />

      <EscalationDetailSheet
        item={activeApprovalEscalation}
        open={approvalSheetOpen}
        onOpenChange={(o) => { setApprovalSheetOpen(o); if (!o) setActiveApprovalEscalation(null); }}
      />
    </>
  );
}
