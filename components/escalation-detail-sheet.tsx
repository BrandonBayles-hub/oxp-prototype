"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chat } from "@/components/ui/chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useEscalations,
  type EscalationItem,
  type EscalationType,
  ESCALATION_STATUSES,
} from "@/lib/escalations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useVault, COMPLIANCE_ITEMS, type VaultItem } from "@/lib/vault-context";
import { useConversations } from "@/lib/conversations-context";
import { useFeedback } from "@/lib/feedback-context";
import { usePermissions } from "@/lib/permissions-context";
import {
  X,
  Building2,
  Calendar,
  FileText,
  Flag,
  Wrench,
  CheckCircle,
  ExternalLink,
  XCircle,
  ArrowLeftRight,
  ArrowUp,
  Clock,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  PenLine,
  BookOpen,
  Loader2,
  Check,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineDiff } from "@/components/inline-diff";
import { HtmlDiff } from "@/components/html-diff";
import { cn } from "@/lib/utils";

/* ─── Helpers ─── */

function isHtmlContent(s: string): boolean {
  const t = s.trim();
  return t.startsWith("<") && t.includes("</");
}

function getAssigneeOptions(humanNames: string[]): string[] {
  return ["Unassigned", ...humanNames.sort((a, b) => a.localeCompare(b))];
}

function formatType(t: EscalationType): string {
  const map: Record<EscalationType, string> = {
    conversation: "Conversation",
    approval: "Approval",
    workflow: "Workflow",
    training: "Training / clarity",
    doc_improvement: "Policy / doc improvement",
  };
  return map[t] ?? t;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatDueDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return "< 1 min";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function useCountdown(targetIso: string | undefined): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return "overdue";
  return formatDuration(diff);
}

/* ─── ELI+ response generation ─── */

type ActionPanel = "messages" | "document" | "notes" | "eli";
type EliMessage = { role: "user" | "assistant"; text: string };

function getInitialEliMessage(item: EscalationItem, relatedDocs: VaultItem[]): string {
  let msg = `I've reviewed this ${formatType(item.type).toLowerCase()} escalation`;
  if (item.property) msg += ` at ${item.property}`;
  msg += ".\n\n";
  if (item.aiReasonForEscalation) {
    msg += `Escalation reason: ${item.aiReasonForEscalation}\n\n`;
  }
  if (relatedDocs.length > 0) {
    msg += `Related documents: ${relatedDocs.map((d) => d.fileName).join(", ")}\n\n`;
  }
  msg += "How can I help you resolve this?";
  return msg;
}

function generateEliResponse(item: EscalationItem, message: string, relatedDocs: VaultItem[]): string {
  const lower = message.toLowerCase();

  if (lower.includes("suggest") || lower.includes("reply") || lower.includes("respond")) {
    if (item.type === "conversation") {
      const reason = item.aiReasonForEscalation
        ? `understand your concern regarding ${item.aiReasonForEscalation.toLowerCase().slice(0, 80)}`
        : "want to help resolve this for you";
      return `Based on the escalation context, here's a suggested response:\n\n"Thank you for reaching out about this. I've reviewed the details and ${reason}. I'll have a resolution for you within 24 business hours."`;
    }
    return "I'd recommend reviewing the relevant policy documentation and making a decision based on the established guidelines. Would you like me to look up the specific policy?";
  }

  if (lower.includes("policy") || lower.includes("document") || lower.includes("doc")) {
    if (relatedDocs.length > 0) {
      const docList = relatedDocs.map((d) => `  \u2022 ${d.fileName}`).join("\n");
      return `I found ${relatedDocs.length} related document${relatedDocs.length > 1 ? "s" : ""} in the library:\n\n${docList}\n\nYou can view ${relatedDocs.length > 1 ? "these" : "this"} in the Document Preview panel.`;
    }
    return "I couldn't find specific policy documents matching this escalation's labels. You may want to check the Training & SOPs section for relevant policies.";
  }

  if (lower.includes("summar")) {
    let s = "Here's a summary of this escalation:\n\n";
    s += `  \u2022 Type: ${formatType(item.type)}\n`;
    s += `  \u2022 Category: ${item.category}\n`;
    if (item.property) s += `  \u2022 Property: ${item.property}\n`;
    if (item.aiReasonForEscalation) s += `  \u2022 Reason: ${item.aiReasonForEscalation}\n`;
    if (item.affectedParty?.name) s += `  \u2022 Affected Party: ${item.affectedParty.name} (${item.affectedParty.type})\n`;
    if (item.status) s += `  \u2022 Status: ${item.status}\n`;
    s += "\nWould you like me to suggest next steps?";
    return s;
  }

  return `I can help you with this ${formatType(item.type).toLowerCase()} escalation. Here are some things I can assist with:\n\n  \u2022 Suggest a response to the ${item.affectedParty?.type || "affected party"}\n  \u2022 Summarize the escalation details\n  \u2022 Find related policies and documents\n  \u2022 Recommend next steps\n\nWhat would you like help with?`;
}

/* ─── Component ─── */

export function EscalationDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: EscalationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateAssignee, updateStatus, updateLabels, markDone, reopen, addReply, addNote, updateInstructionForAgent, handBackToAgent, resolveApproval, removeEscalation } = useEscalations();
  const { hasPermission } = usePermissions();
  const canDeleteTask = hasPermission("p-tasks-delete");
  const { agents } = useAgents();
  const { allLabels: workforceLabels, humanMembers } = useWorkforce();
  const { documents, updateDocument, approveDocument } = useVault();
  const { getConversation, addMessage: addConversationMessage } = useConversations();
  const { items: feedbackItems } = useFeedback();
  const assigneeOptions = useMemo(
    () => getAssigneeOptions(humanMembers.map((m) => m.name)),
    [humanMembers]
  );

  const labelPool = useMemo(() => {
    const set = new Set<string>();
    documents.flatMap((d) => d.tags ?? []).forEach((t) => set.add(t));
    workforceLabels.forEach((t) => set.add(t));
    agents.forEach((a) => (a.labels ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [documents, workforceLabels, agents]);

  /* state */
  const [noteDraft, setNoteDraft] = useState("");
  const [noteAuthor] = useState("Staff");
  const [suggestedReplyDraft, setSuggestedReplyDraft] = useState<string | null>(null);
  const [instructionDraft, setInstructionDraft] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionAmount, setDecisionAmount] = useState("");
  const [selectedTrainingOption, setSelectedTrainingOption] = useState<number | null>(null);
  const [showDiffView, setShowDiffView] = useState(true);
  const [activePanel, setActivePanel] = useState<ActionPanel | null>(null);
  const [eliMessages, setEliMessages] = useState<EliMessage[]>([]);
  const [eliInput, setEliInput] = useState("");
  const [eliThinking, setEliThinking] = useState(false);
  const instructionSavedRef = useRef(false);
  const prevInstructionItemIdRef = useRef<string | null>(null);
  const eliScrollRef = useRef<HTMLDivElement>(null);

  /* effects */
  useEffect(() => {
    if (!item) {
      instructionSavedRef.current = false;
      prevInstructionItemIdRef.current = null;
      setSelectedTrainingOption(null);
      setActivePanel(null);
      setEliMessages([]);
      setEliInput("");
      setDeleteConfirmOpen(false);
      return;
    }
    if (prevInstructionItemIdRef.current !== item.id) {
      prevInstructionItemIdRef.current = item.id;
      instructionSavedRef.current = false;
      setSelectedTrainingOption(null);
      setDecisionComment("");
      setDeleteConfirmOpen(false);
      setActivePanel(null);
      setEliMessages([]);
      setEliInput("");
      const amountRef = (item.references ?? []).find((r) => /amount/i.test(r.title));
      setDecisionAmount(amountRef?.snippet ?? "");
    }
    if (!instructionSavedRef.current) {
      setInstructionDraft(item.instructionForAgent ?? "");
    }
  }, [item?.id, item?.instructionForAgent]);

  useEffect(() => {
    eliScrollRef.current?.scrollTo({ top: eliScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [eliMessages, eliThinking]);

  useEffect(() => {
    if (activePanel === "eli" && eliMessages.length === 0 && item) {
      setEliMessages([{ role: "assistant", text: getInitialEliMessage(item, relatedDocs) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel]);

  /* computed */
  const labels = item?.labels ?? [];
  const labelsNormalized = useMemo(
    () => new Set(labels.map((l: string) => l.trim().toLowerCase())),
    [labels]
  );
  const availableLabelsToAdd = labelPool.filter((t) => !labelsNormalized.has(t.trim().toLowerCase()));

  const relatedDocs = useMemo(() => {
    if (!item) return [] as VaultItem[];
    const itemLabels = new Set((item.labels ?? []).map((l) => l.trim().toLowerCase()));
    if (itemLabels.size === 0) return [] as VaultItem[];
    return documents.filter(
      (d) => d.type === "file" && d.tags?.some((tag) => itemLabels.has(tag.trim().toLowerCase()))
    );
  }, [item?.labels, documents]);

  const originalAmount = useMemo(() => {
    const ref = (item?.references ?? []).find((r) => /amount/i.test(r.title));
    return ref?.snippet ?? "";
  }, [item?.references]);

  const addEscalationLabel = (tag: string) => {
    if (!item) return;
    const t = tag.trim();
    if (!t || labelsNormalized.has(t.toLowerCase())) return;
    const canonical = labelPool.find((l) => l.trim().toLowerCase() === t.toLowerCase()) ?? t;
    updateLabels(item.id, [...labels, canonical]);
  };
  const removeEscalationLabel = (tag: string) => {
    if (!item) return;
    updateLabels(item.id, labels.filter((l) => l !== tag));
  };

  if (!item) return null;

  /* derived (needs item) */
  const escalatingAgent = item.escalatedByAgent
    ? agents.find((a) => a.name === item.escalatedByAgent)
    : undefined;

  const title = item.name ?? item.summary;
  const isConversation = item.type === "conversation";
  const isTraining = item.type === "training";
  const isDocumentApproval = item.type === "approval" && item.documentApprovalContext;
  const isGeneralApproval = item.type === "approval" && !item.documentApprovalContext;
  const docContext = item.documentApprovalContext;
  const hasReferences = item.references && item.references.length > 0;
  const history = item.history ?? [];
  const notes = item.notes ?? [];
  const linkedConversation = item.conversationId ? getConversation(item.conversationId) : undefined;
  const linkedFeedback = item.feedbackId ? feedbackItems.find((f) => f.id === item.feedbackId) : undefined;

  const hasConversation = !!(isConversation && item.conversationContext && item.conversationContext.length > 0);
  const hasDocument = !!(isDocumentApproval && docContext) || relatedDocs.length > 0;

  const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const firstResponseMs = item.firstResponseAt && createdAt
    ? new Date(item.firstResponseAt).getTime() - createdAt
    : null;
  const resolutionMs = item.resolvedAt && createdAt
    ? new Date(item.resolvedAt).getTime() - createdAt
    : null;

  const linkedAgentsForDoc = (() => {
    if (!docContext) return [];
    const doc = documents.find((d) => d.id === docContext.documentId && d.type === "file");
    const ids = doc?.linkedAgentIds ?? [];
    return ids.map((aid) => agents.find((a) => a.id === aid)).filter(Boolean) as { id: string; name: string }[];
  })();

  const docForApproval = docContext
    ? documents.find((d) => d.id === docContext.documentId && d.type === "file")
    : undefined;
  const docTagsForApproval = docForApproval?.tags ?? [];
  const complianceTagsForApproval = docTagsForApproval.filter((t) => COMPLIANCE_ITEMS.includes(t));
  const otherTagsForApproval = docTagsForApproval.filter((t) => !COMPLIANCE_ITEMS.includes(t));

  const canHandBack = (isConversation || isTraining) && item.status !== "Done" && item.status !== "Handed back to agent";
  const amountModified = decisionAmount.trim() !== "" && decisionAmount.trim() !== originalAmount;

  /* handlers */
  const togglePanel = (panel: ActionPanel) => setActivePanel((prev) => (prev === panel ? null : panel));

  const handleSendReply = (text: string) => {
    addReply(item.id, text);
    if (item.conversationId) {
      addConversationMessage(item.conversationId, { role: "staff", text });
    }
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    addNote(item.id, noteAuthor, noteDraft.trim());
    setNoteDraft("");
  };

  const handleMarkDone = () => {
    markDone(item.id);
    onOpenChange(false);
  };

  const handleHandBackToAgent = () => {
    instructionSavedRef.current = true;
    if (instructionDraft.trim() !== (item.instructionForAgent ?? "")) {
      updateInstructionForAgent(item.id, instructionDraft.trim());
    }
    handBackToAgent(item.id);
  };

  const handleConfirmDeleteEscalation = () => {
    removeEscalation(item.id);
    setDeleteConfirmOpen(false);
    onOpenChange(false);
  };

  const deleteTaskFooterButton = canDeleteTask ? (
    <Button
      type="button"
      variant="outline"
      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setDeleteConfirmOpen(true)}
    >
      <Trash2 className="h-4 w-4" />
      Delete task
    </Button>
  ) : null;

  const handleApproveDocument = () => {
    if (!docContext) return;
    if (docContext.proposedBody) {
      updateDocument(docContext.documentId, { body: docContext.proposedBody });
    }
    approveDocument(docContext.documentId, noteAuthor, approvalComment.trim() || undefined);
    markDone(item.id);
    setApproveConfirmOpen(false);
    setApprovalComment("");
    onOpenChange(false);
  };

  const handleDenyDocument = () => {
    if (!docContext) return;
    const existingHistory = docForApproval?.history ?? [];
    const newEntry = {
      at: new Date().toISOString(),
      action: "denied" as const,
      by: noteAuthor,
      note: approvalComment.trim() || undefined,
    };
    updateDocument(docContext.documentId, {
      approvalStatus: "review",
      history: [...existingHistory, newEntry],
    });
    markDone(item.id);
    setApprovalComment("");
    onOpenChange(false);
  };

  const handleResolveApproval = (decision: "approved" | "denied" | "modified") => {
    const handBack = decision !== "denied";
    resolveApproval(item.id, decision, {
      comment: decisionComment.trim() || undefined,
      adjustedAmount: decisionAmount.trim() || undefined,
      decidedBy: noteAuthor,
      handBack,
    });
    if (!handBack) onOpenChange(false);
  };

  const handleEliSend = () => {
    if (!eliInput.trim() || eliThinking) return;
    const userMsg = eliInput.trim();
    setEliMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setEliInput("");
    setEliThinking(true);
    setTimeout(() => {
      const response = generateEliResponse(item, userMsg, relatedDocs);
      setEliMessages((prev) => [...prev, { role: "assistant", text: response }]);
      setEliThinking(false);
    }, 1200);
  };

  /* ═══════════════════════════════════ JSX ═══════════════════════════════════ */

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "flex w-full flex-row overflow-hidden gap-0 p-0",
            "transition-[max-width] duration-300 ease-in-out",
            activePanel ? "sm:max-w-[980px]" : "sm:max-w-xl",
          )}
        >
          <SheetDescription className="sr-only">Escalation details for {title}</SheetDescription>

          {/* ═══ LEFT PANEL ═══ */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hover">
            <SheetHeader className="flex flex-row items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <SheetTitle className="mb-1.5">{title}</SheetTitle>
                {(item.property || item.priority || item.dueAt) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/80 overflow-hidden">
                    {item.property && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">{item.property}</span>
                      </span>
                    )}
                    {item.priority && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                        <Flag className="h-4 w-4 shrink-0" aria-hidden />
                        {item.priority === "urgent" ? "Urgent" : item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    )}
                    {item.dueAt && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                        <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                        Due {formatDueDate(item.dueAt)}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatType(item.type)} · {item.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="Status"
                    >
                      {item.status}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-[10rem] p-1" align="end">
                    {ESCALATION_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateStatus(item.id, s)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                          item.status === s && "font-medium"
                        )}
                      >
                        <span className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                          item.status === s && "border-primary bg-primary text-primary-foreground"
                        )}>
                          {item.status === s && <Check className="h-3 w-3" />}
                        </span>
                        {s}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="mt-0.5" aria-label="Assignee">
                      <Avatar className="h-8 w-8 cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/30">
                        <AvatarFallback className="text-[10px] font-medium">
                          {item.assignee
                            ? item.assignee.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1" align="end">
                    <div className="max-h-56 overflow-y-auto">
                      {assigneeOptions.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => updateAssignee(item.id, a)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                            (item.assignee || "Unassigned") === a && "font-medium"
                          )}
                        >
                          <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                            (item.assignee || "Unassigned") === a && "border-primary bg-primary text-primary-foreground"
                          )}>
                            {(item.assignee || "Unassigned") === a && <Check className="h-3 w-3" />}
                          </span>
                          {a}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </SheetHeader>

            {/* Lifecycle timestamps */}
            {(firstResponseMs !== null || resolutionMs !== null || item.handedBackAt) && (
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                {firstResponseMs !== null && (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />First response: {formatDuration(firstResponseMs)}</span>
                )}
                {resolutionMs !== null && (
                  <span className="inline-flex items-center gap-1"><CheckCircle className="h-3 w-3" />Resolution: {formatDuration(resolutionMs)}</span>
                )}
                {item.handedBackAt && (
                  <span className="inline-flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" />Handed back: {formatTime(item.handedBackAt)}</span>
                )}
              </div>
            )}

            {/* Linked conversation */}
            {linkedConversation && (
              <div className="mt-2 rounded-md border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Linked to live conversation with {linkedConversation.resident}
                  {linkedConversation.unit && ` (${linkedConversation.unit})`}
                </p>
              </div>
            )}

            {/* Linked feedback */}
            {linkedFeedback && (
              <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Created from feedback: &ldquo;{linkedFeedback.comment ?? linkedFeedback.messageText}&rdquo;
                </p>
              </div>
            )}

            {/* Assignee & Labels — both hidden; assignee moved to header avatar */}
            <div className="mt-4 space-y-3">
              {false && (<div>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">Assignee</h4>
                <select
                  value={item?.assignee || "Unassigned"}
                  onChange={(e) => item && updateAssignee(item.id, e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {assigneeOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>)}
              {/* Labels — hidden until ready to re-introduce */}
              {false && (<div>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">Labels</h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  {labels.map((l) => (
                    <Badge key={l} variant="secondary" className="gap-1 text-[10px]">
                      {l}
                      <button type="button" onClick={() => removeEscalationLabel(l)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20" aria-label={`Remove ${l}`}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground">+ Add</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                      <div className="max-h-48 overflow-y-auto">
                        {availableLabelsToAdd.length > 0 ? (
                          availableLabelsToAdd.map((t) => (
                            <button key={t} type="button" onClick={() => addEscalationLabel(t)} className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground">{t}</button>
                          ))
                        ) : (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">No more labels</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>)}
            </div>

            {/* ── Tabs: Details | History ── */}
            <Tabs defaultValue="details" className="mt-6 flex flex-1 flex-col">
              <TabsList className="w-fit">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 flex flex-1 flex-col gap-6">
                {/* Document approval card (diff is in Document panel) */}
                {isDocumentApproval && docContext && (
                  <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />Document for review
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <Link href={`/trainings-sop/detail?id=${docContext.documentId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        {docContext.documentName}<ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </p>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      {item.escalatedByAgent && (
                        <div className="flex gap-1.5"><dt className="font-semibold">Submitted by</dt><dd>{item.escalatedByAgent}</dd></div>
                      )}
                      <div className="flex gap-1.5"><dt className="font-semibold">Date</dt><dd>{formatTime(item.createdAt)}</dd></div>
                    </dl>
                    <div>
                      <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1.5">What was changed</h4>
                      <p className="text-sm text-foreground">{docContext.changeSummary}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Open the{" "}
                      <button type="button" onClick={() => togglePanel("document")} className="text-primary hover:underline font-medium">
                        Document Preview
                      </button>{" "}
                      panel to review changes.
                    </p>
                    <div>
                      <label htmlFor="approval-comment" className="text-[10px] font-semibold tracking-wider text-muted-foreground">Reviewer comment</label>
                      <textarea
                        id="approval-comment"
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        placeholder="Optional note for document history"
                        rows={2}
                        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                      />
                    </div>
                  </section>
                )}

                {/* Escalation Reason + HIL */}
                {(item.aiReasonForEscalation || item.escalatedByAgent || escalatingAgent) && (
                  <section className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">Escalation Reason</h3>
                      {item.escalatedByAgent && (
                        <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-white">{item.escalatedByAgent}</span>
                      )}
                    </div>
                    {item.aiReasonForEscalation && (
                      <p className="mt-3 text-sm font-normal leading-snug text-foreground">{item.aiReasonForEscalation}</p>
                    )}
                    {(escalatingAgent?.vaultBinding || (escalatingAgent?.guardrails && escalatingAgent.guardrails !== "None")) && (
                      <dl className="mt-3 space-y-1 text-xs font-normal text-muted-foreground">
                        {escalatingAgent?.vaultBinding && (
                          <div className="flex gap-2"><dt className="shrink-0 font-normal text-muted-foreground">Policy set (Vault)</dt><dd>{escalatingAgent.vaultBinding}</dd></div>
                        )}
                        {escalatingAgent?.guardrails && escalatingAgent.guardrails !== "None" && (
                          <div className="flex gap-2"><dt className="shrink-0 font-normal text-muted-foreground">Guardrails</dt><dd>{escalatingAgent.guardrails}</dd></div>
                        )}
                      </dl>
                    )}

                    {/* HIL: instruct the agent */}
                    {(item.aiReasonForEscalation || isTraining) && (isConversation || isTraining) && (
                      <div className="mt-4 border-t border-border/60 pt-4">
                        {item.trainingOptions && item.trainingOptions.length > 0 ? (
                          <>
                            <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground">Train the agent</h4>
                            <p className="mt-1.5 text-sm text-muted-foreground">Select the correct guidance so the agent learns how to handle this going forward.</p>
                            <ul className="mt-3 space-y-2">
                              {item.trainingOptions.map((opt, idx) => (
                                <li key={idx}>
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedTrainingOption(idx); setInstructionDraft(opt); }}
                                    className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${selectedTrainingOption === idx ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"}`}
                                  >
                                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selectedTrainingOption === idx ? "border-primary" : "border-muted-foreground/40"}`}>
                                      {selectedTrainingOption === idx && <span className="h-2 w-2 rounded-full bg-primary" />}
                                    </span>
                                    <span className="text-foreground">{opt}</span>
                                  </button>
                                </li>
                              ))}
                              <li>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedTrainingOption(-1); setInstructionDraft(""); }}
                                  className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${selectedTrainingOption === -1 ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"}`}
                                >
                                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selectedTrainingOption === -1 ? "border-primary" : "border-muted-foreground/40"}`}>
                                    {selectedTrainingOption === -1 && <span className="h-2 w-2 rounded-full bg-primary" />}
                                  </span>
                                  <span className="text-muted-foreground">Other</span>
                                </button>
                                {selectedTrainingOption === -1 && (
                                  <textarea
                                    value={instructionDraft}
                                    onChange={(e) => setInstructionDraft(e.target.value)}
                                    placeholder="Describe the correct guidance..."
                                    rows={3}
                                    className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                                  />
                                )}
                              </li>
                            </ul>
                          </>
                        ) : (
                          <>
                            <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground">What to do</h4>
                            <ul className="mt-2 list-inside list-decimal space-y-1.5 pl-0.5 text-sm font-normal leading-relaxed text-foreground">
                              <li>Instruct the agent with the missing policy or how to respond — then send &amp; hand back.</li>
                              <li>Or reply to the resident yourself in the Messages panel.</li>
                            </ul>
                            <label htmlFor="instruction-for-agent" className="sr-only">Instruction for agent</label>
                            <textarea
                              id="instruction-for-agent"
                              value={instructionDraft}
                              onChange={(e) => setInstructionDraft(e.target.value)}
                              onBlur={() => {
                                const trimmed = instructionDraft.trim();
                                if (trimmed !== (item.instructionForAgent ?? "")) {
                                  instructionSavedRef.current = true;
                                  updateInstructionForAgent(item.id, trimmed);
                                }
                              }}
                              placeholder="e.g. Late fee is $75 after 5 days. Use lease §4.2."
                              rows={3}
                              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Handed back status */}
                {item.status === "Handed back to agent" && (
                  <section className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <ArrowLeftRight className="h-4 w-4" />
                      <span className="font-medium">Agent is processing your instruction</span>
                    </div>
                    {item.instructionForAgent && (
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">Instruction: &ldquo;{item.instructionForAgent}&rdquo;</p>
                    )}
                  </section>
                )}

                {/* General approval: decision */}
                {isGeneralApproval && !item.resolution && item.status !== "Done" && item.status !== "Handed back to agent" && (
                  <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Decision</h3>
                    {originalAmount && (
                      <div>
                        <label htmlFor="decision-amount" className="text-[10px] font-semibold tracking-wider text-muted-foreground">Amount</label>
                        <input id="decision-amount" type="text" value={decisionAmount} onChange={(e) => setDecisionAmount(e.target.value)} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <label htmlFor="decision-comment" className="text-[10px] font-semibold tracking-wider text-muted-foreground">Comment or instructions for agent</label>
                      <textarea id="decision-comment" value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} placeholder="Optional — e.g. why approved, conditions, adjusted amount rationale" rows={2} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground" />
                    </div>
                  </section>
                )}

                {/* General approval: resolution summary */}
                {isGeneralApproval && item.resolution && (
                  <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Resolution</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.resolution.decision === "denied" ? "destructive" : "default"}>
                        {item.resolution.decision === "approved" ? "Approved" : item.resolution.decision === "denied" ? "Denied" : "Approved with changes"}
                      </Badge>
                    </div>
                    {item.resolution.adjustedAmount && <p className="text-sm text-foreground"><span className="text-muted-foreground">Amount:</span> {item.resolution.adjustedAmount}</p>}
                    {item.resolution.comment && <p className="text-sm text-foreground"><span className="text-muted-foreground">Comment:</span> {item.resolution.comment}</p>}
                    <p className="text-xs text-muted-foreground">{item.resolution.decidedBy} &middot; {formatTime(item.resolution.decidedAt)}</p>
                  </section>
                )}

                {/* Affected Party */}
                {item.affectedParty && (
                  <section className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground">Affected Party</p>
                    {item.affectedParty.name && <p className="font-medium text-foreground">{item.affectedParty.name}</p>}
                    <div className={`flex flex-wrap items-center gap-2 ${item.affectedParty.name ? "mt-1.5" : ""}`}>
                      <span className={item.affectedParty.type === "resident" ? "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" : item.affectedParty.type === "lead" ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"}>
                        {item.affectedParty.type === "resident" ? "Resident" : item.affectedParty.type === "lead" ? "Lead" : "Vendor"}
                      </span>
                      {item.affectedParty.status && <span className="text-xs text-muted-foreground">{item.affectedParty.status}</span>}
                    </div>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      {item.property && <><dt className="sr-only">Property</dt><dd>{item.property}</dd></>}
                      {item.affectedParty.unit && <><dt className="sr-only">Unit</dt><dd>Unit {item.affectedParty.unit}</dd></>}
                      {item.affectedParty.detail && <><dt className="sr-only">Detail</dt><dd>{item.affectedParty.detail}</dd></>}
                    </dl>
                  </section>
                )}

                {/* References */}
                {hasReferences && (
                  <section>
                    <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">References</h4>
                    <ul className="space-y-2">
                      {item.references!.map((ref, i) => (
                        <li key={i} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                          <span className="font-medium">{ref.title}</span>
                          {ref.section && <span className="ml-1 text-muted-foreground">{ref.section}</span>}
                          {ref.snippet && <p className="mt-1 text-muted-foreground">{ref.snippet}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Document impact */}
                {isDocumentApproval && docContext && (
                  <section className="rounded-lg border border-border bg-muted/20 p-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Document impact</h4>
                    <p className="mb-3 text-xs text-muted-foreground">Approving this document will affect the following:</p>
                    {linkedAgentsForDoc.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">Linked AI agents</p>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedAgentsForDoc.map((a) => (
                            <span key={a.id} className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">{a.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(complianceTagsForApproval.length > 0 || otherTagsForApproval.length > 0) && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">Compliance &amp; tags</p>
                        <div className="flex flex-wrap gap-1.5 text-sm">
                          {complianceTagsForApproval.map((t) => (
                            <span key={t} className="rounded-md border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{t}</span>
                          ))}
                          {otherTagsForApproval.map((t) => (
                            <span key={t} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {linkedAgentsForDoc.length === 0 && complianceTagsForApproval.length === 0 && otherTagsForApproval.length === 0 && (
                      <p className="text-xs text-muted-foreground">No linked agents or tags.</p>
                    )}
                  </section>
                )}

                {/* Quick Actions */}
                {!isDocumentApproval && (
                  <section className="rounded-lg border border-border bg-muted/20 p-4">
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Create work order</Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Send notice</Button>
                    </div>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <ul className="space-y-2">
                  {history.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No history yet.</li>
                  ) : (
                    [...history].reverse().map((h, i) => (
                      <li key={i} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{formatTime(h.at)}{h.by ? ` · ${h.by}` : ""}</span>
                        <p className="mt-0.5">
                          <span className="font-medium">{h.action}</span>
                          {h.detail && <span className="text-muted-foreground"> &mdash; {h.detail}</span>}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </TabsContent>
            </Tabs>
            {/* end scrollable area */}
          </div>

          {/* Footer actions — sticky at bottom, contextual primary CTA per task type */}
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex flex-wrap justify-end gap-2">
              {item.status === "Done" ? (
                canDeleteTask ? (
                  <>
                    {deleteTaskFooterButton}
                    <Button type="button" variant="outline" className="min-w-[140px]" onClick={() => reopen(item.id)}>Reopen</Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => reopen(item.id)}>Reopen</Button>
                )
              ) : isDocumentApproval && docContext ? (
                <>
                  {deleteTaskFooterButton}
                  <Button type="button" variant="outline" className="gap-1.5" onClick={handleDenyDocument}>
                    <XCircle className="h-4 w-4" />Deny
                  </Button>
                  <Button type="button" className="gap-1.5" onClick={() => setApproveConfirmOpen(true)}>
                    <CheckCircle className="h-4 w-4" />Approve &amp; publish
                  </Button>
                </>
              ) : isGeneralApproval && !item.resolution ? (
                <>
                  {deleteTaskFooterButton}
                  <Button type="button" variant="outline" className="gap-1.5" onClick={() => handleResolveApproval("denied")}>
                    <XCircle className="h-4 w-4" />Deny
                  </Button>
                  {originalAmount && (
                    <Button type="button" variant="outline" className="gap-1.5" disabled={!amountModified} onClick={() => handleResolveApproval("modified")}>
                      <CheckCircle className="h-4 w-4" />Approve with changes
                    </Button>
                  )}
                  <Button type="button" className="gap-1.5" onClick={() => handleResolveApproval("approved")}>
                    <CheckCircle className="h-4 w-4" />Approve
                  </Button>
                </>
              ) : canHandBack ? (
                <>
                  {deleteTaskFooterButton}
                  <Button type="button" className="gap-1.5" disabled={!instructionDraft.trim()} onClick={handleHandBackToAgent}>
                    <ArrowLeftRight className="h-4 w-4" />Send instruction &amp; hand back
                  </Button>
                </>
              ) : (
                deleteTaskFooterButton
              )}
            </div>
          </div>
          </div>

          {/* ═══ EXPANDABLE RIGHT PANEL ═══ */}
          <div
            className={cn(
              "flex h-full shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
              activePanel ? "w-[400px] border-l border-border" : "w-0",
            )}
          >
            <div className="flex h-full min-h-0 min-w-[400px] flex-col">

              {/* ── Messages Panel ── */}
              <div className={cn("flex h-full min-h-0 flex-col", activePanel !== "messages" && "hidden")}>
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Messages</h3>
                  {item.affectedParty?.name && <span className="text-xs text-muted-foreground">{item.affectedParty.name}</span>}
                </div>
                {hasConversation ? (
                  <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                      <Chat
                        className="h-full w-full rounded-none border-0"
                        messages={item.conversationContext!.map((msg, idx) => ({ ...msg, id: `conv-${idx}` }))}
                        onSend={handleSendReply}
                        placeholder="Reply..."
                        injectDraft={suggestedReplyDraft ?? undefined}
                        onInjectApplied={() => setSuggestedReplyDraft(null)}
                        roleLabels={{
                          resident: item.affectedParty?.name ?? "Resident",
                          agent: "Agent",
                          staff: "Staff",
                        }}
                        roleVariant={{ resident: "inbound", agent: "outbound", staff: "outbound" }}
                        suggestions={isConversation ? [
                          "Your community's late fee is [confirm amount from lease]. I can send you the exact wording from your lease if helpful.",
                          "I've escalated for a team member to confirm the policy and get back to you within 24 hours.",
                        ] : undefined}
                        onSuggestionClick={(text) => setSuggestedReplyDraft(text)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <p className="text-sm text-muted-foreground text-center">No conversation context for this escalation.</p>
                  </div>
                )}
              </div>

              {/* ── Document Preview Panel ── */}
              <div className={cn("flex h-full flex-col", activePanel !== "document" && "hidden")}>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Document Preview</h3>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hover">
                  {isDocumentApproval && docContext ? (
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                          {showDiffView && docContext.previousBody ? "Changes" : "Proposed content"}
                        </h4>
                        {docContext.previousBody && (
                          <button type="button" onClick={() => setShowDiffView((v) => !v)} className="text-[10px] font-medium text-primary hover:underline">
                            {showDiffView ? "Show clean" : "Show changes"}
                          </button>
                        )}
                      </div>
                      <div className="rounded-md border border-border/60 bg-background p-3 text-sm">
                        {showDiffView && docContext.previousBody ? (
                          isHtmlContent(docContext.proposedBody) || isHtmlContent(docContext.previousBody) ? (
                            <HtmlDiff oldHtml={docContext.previousBody} newHtml={docContext.proposedBody} />
                          ) : (
                            <div className="whitespace-pre-wrap"><InlineDiff oldText={docContext.previousBody} newText={docContext.proposedBody} /></div>
                          )
                        ) : isHtmlContent(docContext.proposedBody) ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: docContext.proposedBody }} />
                        ) : (
                          <div className="whitespace-pre-wrap">{docContext.proposedBody || "\u2014"}</div>
                        )}
                      </div>
                    </div>
                  ) : relatedDocs.length > 0 ? (
                    <div className="p-4 space-y-3">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">RELATED DOCUMENTS</p>
                      {relatedDocs.map((doc) => (
                        <div key={doc.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                          <Link href={`/trainings-sop/detail?id=${doc.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                            <BookOpen className="h-3.5 w-3.5" />{doc.fileName}<ExternalLink className="h-3 w-3" />
                          </Link>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {doc.tags.map((tag) => (
                                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                              ))}
                            </div>
                          )}
                          {doc.body && (
                            <div className="text-xs text-muted-foreground line-clamp-4">
                              {isHtmlContent(doc.body) ? (
                                <div dangerouslySetInnerHTML={{ __html: doc.body.slice(0, 300) }} />
                              ) : (
                                doc.body.slice(0, 300)
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground text-center">No related documents found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Notes Panel ── */}
              <div className={cn("flex h-full flex-col bg-muted", activePanel !== "notes" && "hidden")}>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <span className="text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hover px-3 py-3 space-y-3">
                  {notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map((n, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-medium tracking-wider text-muted-foreground">{formatTime(n.at)} · {n.by}</span>
                          <div className="max-w-[85%] rounded-2xl border border-border bg-background px-3 py-2 text-sm shadow-sm">
                            {n.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    </div>
                  )}
                </div>
                <div className="mt-auto flex flex-col gap-1.5 bg-muted px-3 pt-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">SUGGESTED NOTES</p>
                  {[
                    "Following up with resident.",
                    "Waiting on maintenance / vendor.",
                    "Policy confirmed with team; will reply shortly.",
                  ].map((text) => (
                    <button key={text} type="button" onClick={() => setNoteDraft(text)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 line-clamp-2">
                      {text}
                    </button>
                  ))}
                </div>
                <div className="bg-muted p-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:shadow-md">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                      placeholder="Add an internal note..."
                      rows={1}
                      className="min-h-[40px] max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={!noteDraft.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Add note"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── ELI+ Assist Panel ── */}
              <div className={cn("flex h-full flex-col bg-muted", activePanel !== "eli" && "hidden")}>
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <img src="/tessaract.svg" alt="" className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">ELI+ Assist</h3>
                </div>
                {relatedDocs.length > 0 && (
                  <div className="border-b border-border px-4 py-3">
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground">RELATED DOCUMENTS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedDocs.map((d) => (
                        <Link
                          key={d.id}
                          href={`/trainings-sop/detail?id=${d.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <BookOpen className="h-3 w-3 text-muted-foreground" />{d.fileName}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={eliScrollRef} className="flex-1 overflow-y-auto scrollbar-hover px-3 py-3 space-y-3">
                  {eliMessages.map((msg, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                        {msg.role === "user" ? "You" : "ELI+"}
                      </span>
                      {msg.role === "assistant" ? (
                        <div className="max-w-[85%] rounded-2xl border border-border bg-background px-3 py-2 text-sm shadow-sm">
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      ) : (
                        <div className="max-w-full py-1 text-sm text-foreground">
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {eliThinking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      </div>
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
                <div className="mt-auto bg-muted p-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:shadow-md">
                    <textarea
                      value={eliInput}
                      onChange={(e) => setEliInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEliSend(); } }}
                      placeholder="Ask ELI+ about this escalation..."
                      rows={1}
                      disabled={eliThinking}
                      className="min-h-[40px] max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleEliSend}
                      disabled={!eliInput.trim() || eliThinking}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Send"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ═══ ACTION BAR ═══ */}
          <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-l border-border/40 bg-muted/10 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="my-2 h-px w-6 bg-border" />

            {hasConversation && (
              <button
                type="button"
                onClick={() => togglePanel("messages")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  activePanel === "messages" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="Messages"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            )}

            {hasDocument && (
              <button
                type="button"
                onClick={() => togglePanel("document")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  activePanel === "document" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-label="Document Preview"
                title="Document Preview"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => togglePanel("notes")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                activePanel === "notes" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label="Notes"
              title="Notes"
            >
              <PenLine className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel("eli")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                activePanel === "eli" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label="ELI+ Assist"
              title="ELI+ Assist"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

        </SheetContent>
      </Sheet>

      {/* Confirm approval dialog */}
      <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm approval</DialogTitle>
            <DialogDescription>
              Approving will update this document and apply the proposed changes. The following AI agents are linked to this document and may be affected by the update:
            </DialogDescription>
          </DialogHeader>
          {linkedAgentsForDoc.length > 0 ? (
            <ul className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {linkedAgentsForDoc.map((a) => (
                <li key={a.id} className="font-medium text-foreground">{a.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No agents are currently linked to this document.</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleApproveDocument}>Confirm approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-foreground">{title}</span> from your queue? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteEscalation}>Delete task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
