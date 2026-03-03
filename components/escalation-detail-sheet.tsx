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
import {
  useEscalations,
  type EscalationItem,
  type EscalationType,
  ESCALATION_STATUSES,
} from "@/lib/escalations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { useVault, COMPLIANCE_ITEMS } from "@/lib/vault-context";
import { Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Calendar, FileText, Flag, Wrench, CheckCircle, ExternalLink, XCircle } from "lucide-react";

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

export function EscalationDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: EscalationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateAssignee, updateStatus, updateLabels, markDone, reopen, addReply, addNote, updateInstructionForAgent } = useEscalations();
  const { agents } = useAgents();
  const { allLabels: workforceLabels, humanMembers } = useWorkforce();
  const { documents, updateDocument, approveDocument } = useVault();
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
  const [noteDraft, setNoteDraft] = useState("");
  const [noteAuthor] = useState("Staff"); // Could come from auth
  const [suggestedReplyDraft, setSuggestedReplyDraft] = useState<string | null>(null);
  const [instructionDraft, setInstructionDraft] = useState("");
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const instructionSavedRef = useRef(false);
  const prevInstructionItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!item) {
      instructionSavedRef.current = false;
      prevInstructionItemIdRef.current = null;
      return;
    }
    if (prevInstructionItemIdRef.current !== item.id) {
      prevInstructionItemIdRef.current = item.id;
      instructionSavedRef.current = false;
    }
    if (!instructionSavedRef.current) {
      setInstructionDraft(item.instructionForAgent ?? "");
    }
  }, [item?.id, item?.instructionForAgent]);

  const labels = item?.labels ?? [];
  const labelsNormalized = useMemo(
    () => new Set(labels.map((l: string) => l.trim().toLowerCase())),
    [labels]
  );
  const availableLabelsToAdd = labelPool.filter((t) => !labelsNormalized.has(t.trim().toLowerCase()));
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

  const escalatingAgent = item.escalatedByAgent
    ? agents.find((a) => a.name === item.escalatedByAgent)
    : undefined;

  const title = item.name ?? item.summary;
  const isConversation = item.type === "conversation";
  const isDocumentApproval = item.type === "approval" && item.documentApprovalContext;
  const docContext = item.documentApprovalContext;
  const hasReferences = item.references && item.references.length > 0;
  const history = item.history ?? [];
  const notes = item.notes ?? [];

  const handleSendReply = (text: string) => {
    addReply(item.id, text);
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
  const complianceTagsForApproval = docTagsForApproval.filter((t) =>
    COMPLIANCE_ITEMS.includes(t)
  );
  const otherTagsForApproval = docTagsForApproval.filter((t) => !COMPLIANCE_ITEMS.includes(t));

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
      approvalStatus: "draft",
      history: [...existingHistory, newEntry],
    });
    markDone(item.id);
    setApprovalComment("");
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="mb-1.5">{title}</SheetTitle>
            {(item.property || item.priority || item.dueAt) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                {item.property && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                    <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                    {item.property}
                  </span>
                )}
                {item.priority && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
                    <Flag className="h-4 w-4 shrink-0" aria-hidden />
                    {item.priority === "urgent" ? "Urgent" : item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </span>
                )}
                {item.dueAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1">
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
          <select
            value={item.status}
            onChange={(e) => updateStatus(item.id, e.target.value)}
            className="mt-0.5 shrink-0 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Status"
          >
            {ESCALATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6 flex flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 flex flex-1 flex-col gap-6">
            {/* Document approval: review view — document + what was changed */}
            {isDocumentApproval && docContext && (
              <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Document for review
                </h3>
                <p className="text-sm text-muted-foreground">
                  <Link
                    href={`/trainings-sop/${docContext.documentId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {docContext.documentName}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
                <div>
                  <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1.5">What was changed</h4>
                  <p className="text-sm text-foreground rounded-md border border-border/60 bg-background p-3">
                    {docContext.changeSummary}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground mb-1.5">Proposed content (preview)</h4>
                  <div
                    className="max-h-[280px] overflow-y-auto rounded-md border border-border/60 bg-background p-3 text-sm prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={
                      docContext.proposedBody.trim().startsWith("<") && docContext.proposedBody.includes("</")
                        ? { __html: docContext.proposedBody }
                        : undefined
                    }
                  >
                    {docContext.proposedBody.trim().startsWith("<") && docContext.proposedBody.includes("</")
                      ? null
                      : docContext.proposedBody || "—"}
                  </div>
                </div>
                <div>
                  <label htmlFor="approval-comment" className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                    Reviewer comment
                  </label>
                  <textarea
                    id="approval-comment"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Optional note for document history (e.g. why approved or denied)"
                    rows={2}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" className="gap-1.5" onClick={() => setApproveConfirmOpen(true)}>
                    <CheckCircle className="h-4 w-4" />
                    Approve & publish
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleDenyDocument}>
                    <XCircle className="h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </section>
            )}

            {/* Why it escalated + HIL: instruct the agent or reply to resident yourself */}
            {(item.aiReasonForEscalation || item.escalatedByAgent || escalatingAgent) && (
              <section className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Escalation Reason
                  </h3>
                  {item.escalatedByAgent && (
                    <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {item.escalatedByAgent}
                    </span>
                  )}
                </div>
                <h4 className="mt-3 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  Why It Escalated
                </h4>
                {item.aiReasonForEscalation && (
                  <p className="mt-2 text-sm font-normal leading-snug text-foreground">
                    {item.aiReasonForEscalation}
                  </p>
                )}
                {(escalatingAgent?.vaultBinding || (escalatingAgent?.guardrails && escalatingAgent.guardrails !== "None")) && (
                  <dl className="mt-3 space-y-1 text-xs font-normal text-muted-foreground">
                    {escalatingAgent?.vaultBinding && (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-normal text-muted-foreground">Policy set (Vault)</dt>
                        <dd>{escalatingAgent.vaultBinding}</dd>
                      </div>
                    )}
                    {escalatingAgent?.guardrails && escalatingAgent.guardrails !== "None" && (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-normal text-muted-foreground">Guardrails</dt>
                        <dd>{escalatingAgent.guardrails}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {/* HIL: instruct the agent, or reply to resident yourself */}
                {(item.aiReasonForEscalation || item.type === "training") && isConversation && (
                  <div className="mt-4 border-t border-border/60 pt-4">
                    <h4 className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                      What to do
                    </h4>
                    <ul className="mt-2 list-inside list-decimal space-y-1.5 pl-0.5 text-sm font-normal leading-relaxed text-foreground">
                      <li>Instruct the agent with the missing policy or how to respond — it can then reply to the resident.</li>
                      <li>Or treat this as higher risk and reply to the resident yourself in the Conversation section below.</li>
                    </ul>
                    <label htmlFor="instruction-for-agent" className="sr-only">
                      Instruction for agent
                    </label>
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        instructionSavedRef.current = true;
                        updateInstructionForAgent(item.id, instructionDraft.trim());
                      }}
                    >
                      Save instruction
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Affected Party (resident/lead/vendor) — when task concerns a person */}
            {item.affectedParty && (
              <section className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  Affected Party
                </p>
                {item.affectedParty.name && (
                  <p className="font-medium text-foreground">
                    {item.affectedParty.name}
                  </p>
                )}
                <div className={`flex flex-wrap items-center gap-2 ${item.affectedParty.name ? "mt-1.5" : ""}`}>
                  <span
                    className={
                      item.affectedParty.type === "resident"
                        ? "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                        : item.affectedParty.type === "lead"
                          ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }
                  >
                    {item.affectedParty.type === "resident"
                      ? "Resident"
                      : item.affectedParty.type === "lead"
                        ? "Lead"
                        : "Vendor"}
                  </span>
                  {item.affectedParty.status && (
                    <span className="text-xs text-muted-foreground">
                      {item.affectedParty.status}
                    </span>
                  )}
                </div>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                  {item.property && (
                    <>
                      <dt className="sr-only">Property</dt>
                      <dd>{item.property}</dd>
                    </>
                  )}
                  {item.affectedParty.unit && (
                    <>
                      <dt className="sr-only">Unit</dt>
                      <dd>Unit {item.affectedParty.unit}</dd>
                    </>
                  )}
                  {item.affectedParty.detail && (
                    <>
                      <dt className="sr-only">Detail</dt>
                      <dd>{item.affectedParty.detail}</dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            {/* Property — only when there's no affected party (otherwise it's in that block) */}
            {item.property && !item.affectedParty && (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                  Property
                </h4>
                <p className="text-sm">{item.property}</p>
              </section>
            )}

            {/* Link to source (thread, workflow run) — TDD §4.6.1 */}
            {item.linkToSource && (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                  Source
                </h4>
                <p className="text-sm text-foreground">{item.linkToSource}</p>
              </section>
            )}

            {hasReferences && (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                  References
                </h4>
                <ul className="space-y-2">
                  {item.references!.map((ref, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{ref.title}</span>
                      {ref.section && (
                        <span className="ml-1 text-muted-foreground">{ref.section}</span>
                      )}
                      {ref.snippet && (
                        <p className="mt-1 text-muted-foreground">{ref.snippet}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                Assignee
              </h4>
              <select
                value={item.assignee || "Unassigned"}
                onChange={(e) => updateAssignee(item.id, e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {assigneeOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </section>

            <section>
              <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Routing labels
              </h4>
              <p className="mb-2 text-[10px] text-muted-foreground">
                Used for assignee matching; add or remove to change routing.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium"
                  >
                    {l}
                    <button type="button" onClick={() => removeEscalationLabel(l)} className="rounded hover:bg-muted" aria-label={`Remove ${l}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) addEscalationLabel(v);
                    e.target.value = "";
                  }}
                  className="h-8 min-w-0 max-w-[160px] rounded border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none focus:ring-1"
                  aria-label="Add existing label"
                >
                  <option value="">Add existing…</option>
                  {availableLabelsToAdd.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Create new label"
                  className="h-8 w-32 min-w-0 rounded border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none focus:ring-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addEscalationLabel((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => {
                  const input = (e.currentTarget.parentElement?.querySelector('input[type="text"]') as HTMLInputElement);
                  if (input?.value) { addEscalationLabel(input.value); input.value = ""; }
                }}>
                  Add
                </Button>
              </div>
            </section>

            {/* Document approval: show what this document is linked to (agents, compliance/tags) */}
            {isDocumentApproval && docContext && (
              <section className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                  Document impact
                </h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Approving this document will affect the following:
                </p>
                {linkedAgentsForDoc.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                      Linked AI agents
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedAgentsForDoc.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground"
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(complianceTagsForApproval.length > 0 || otherTagsForApproval.length > 0) && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                      Compliance & tags
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-sm">
                      {complianceTagsForApproval.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                        >
                          {t}
                        </span>
                      ))}
                      {otherTagsForApproval.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {linkedAgentsForDoc.length === 0 &&
                  complianceTagsForApproval.length === 0 &&
                  otherTagsForApproval.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No linked agents or tags. This document is not yet linked to any AI agents or compliance items.
                    </p>
                  )}
              </section>
            )}

            {/* ELI+ Assist: only for non–document-approval escalations */}
            {!isDocumentApproval && (
              <section className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                  ELI+ Assist
                </h4>
                {isConversation && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                      Suggested replies (from policy)
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {[
                        "Your community's late fee is [confirm amount from lease]. I can send you the exact wording from your lease if helpful.",
                        "I've escalated for a team member to confirm the policy and get back to you within 24 hours.",
                      ].map((text) => (
                        <li key={text}>
                          <button
                            type="button"
                            onClick={() => setSuggestedReplyDraft(text)}
                            className="flex w-full gap-2 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              &ldquo;{text}&rdquo;
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  Quick actions
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    Create work order
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Send notice
                  </Button>
                </div>
              </section>
            )}

            {isConversation && item.conversationContext && item.conversationContext.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                  Conversation
                </h4>
                <Chat
                  messages={item.conversationContext.map((msg, idx) => ({ ...msg, id: `conv-${idx}` }))}
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
                  messageListHeight={260}
                />
              </section>
            )}

            <div className="mt-auto border-t border-border pt-4">
              {item.status !== "Done" ? (
                <Button type="button" className="w-full" onClick={handleMarkDone}>
                  Mark Done
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => reopen(item.id)}
                >
                  Reopen
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
              History
            </h4>
            <ul className="space-y-1.5 text-sm">
              {history.length === 0 ? (
                <li className="text-muted-foreground">No history yet.</li>
              ) : (
                [...history].reverse().map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">{formatTime(h.at)}</span>
                    <span className="font-medium">{h.action}</span>
                    {h.by && <span className="text-muted-foreground">by {h.by}</span>}
                    {h.detail && <span className="text-muted-foreground">— {h.detail}</span>}
                  </li>
                ))
              )}
            </ul>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
              Notes
            </h4>
            {notes.length > 0 && (
              <ul className="mb-3 space-y-2 text-sm">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <span className="text-muted-foreground">{formatTime(n.at)} · {n.by}</span>
                    <p className="mt-1">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
              Suggested notes
            </p>
            <ul className="mb-3 space-y-1.5 text-sm">
              {[
                "Following up with resident.",
                "Waiting on maintenance / vendor.",
                "Policy confirmed with team; will reply shortly.",
              ].map((text) => (
                <li key={text}>
                  <button
                    type="button"
                    onClick={() => setNoteDraft(text)}
                    className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-left text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                  >
                    {text}
                  </button>
                </li>
              ))}
            </ul>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add an internal note..."
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleAddNote}
              disabled={!noteDraft.trim()}
            >
              Add note
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>

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
            <Button variant="outline" onClick={() => setApproveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveDocument}>
              Confirm approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
