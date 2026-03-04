"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  X,
  Building2,
  Calendar,
  Clock,
  RotateCw,
  ChevronDown,
  PenLine,
  Bell,
  MessageSquare,
  Link2,
  Paperclip,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EscalationItem } from "@/lib/escalations-context";
import { useEscalations, ESCALATION_STATUSES } from "@/lib/escalations-context";
import type { TaskSections } from "@/lib/specialties-data";

// ── Types ────────────────────────────────────────────────────────────────────

type CustomTaskDetailSheetProps = {
  item: EscalationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const STATUS_OPTIONS = ["Open", "In Progress", "Done"] as const;

// ── Component ────────────────────────────────────────────────────────────────

export function CustomTaskDetailSheet({
  item,
  open,
  onOpenChange,
}: CustomTaskDetailSheetProps) {
  const { updateStatus, markDone, reopen } = useEscalations();

  const [checkState, setCheckState] = useState<Record<number, boolean>>({});
  const [statusOpen, setStatusOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");

  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  const itemId = item?.id;
  useEffect(() => {
    setCheckState({});
    setLinks([]);
    setNewLink("");
    setAttachments([]);
    setActiveTab("details");
  }, [itemId]);

  const sections: TaskSections | undefined = (item as Record<string, unknown>)?.sections as TaskSections | undefined;
  const descriptionHtml: string | undefined = (item as Record<string, unknown>)?.descriptionHtml as string | undefined;

  const checklistItems = useMemo(() => sections?.checklist?.items ?? [], [sections?.checklist?.items]);
  const requireAll = sections?.checklist?.requireAll ?? false;

  const allChecked = useMemo(() => {
    if (checklistItems.length === 0) return true;
    return checklistItems.every((_, i) => checkState[i]);
  }, [checkState, checklistItems]);

  const linksRequired = sections?.links?.required ?? false;
  const attachmentsRequired = sections?.attachments?.required ?? false;

  const linksSatisfied = !linksRequired || links.length > 0;
  const attachmentsSatisfied = !attachmentsRequired || attachments.length > 0;
  const checklistSatisfied = !requireAll || allChecked;

  const canComplete = linksSatisfied && attachmentsSatisfied && checklistSatisfied;

  if (!item) return null;

  const status = item.status === "Done" ? "Done" : item.status === "In progress" ? "In Progress" : "Open";

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Done") {
      markDone(item.id);
    } else if (item.status === "Done" && newStatus !== "Done") {
      reopen(item.id);
      if (newStatus === "In Progress") {
        updateStatus(item.id, "In progress");
      }
    } else {
      updateStatus(item.id, newStatus === "In Progress" ? "In progress" : "Open");
    }
    setStatusOpen(false);
  };

  const handleMarkComplete = () => {
    if (!canComplete) return;
    markDone(item.id);
  };

  const statusBadgeClass = (s: string) => {
    switch (s) {
      case "In Progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
      case "Done":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full p-0 flex">
        <SheetHeader className="sr-only">
          <SheetTitle>{item.name}</SheetTitle>
          <SheetDescription>Task details for {item.name}</SheetDescription>
        </SheetHeader>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground leading-snug pt-0.5">
              {item.name}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      statusBadgeClass(status)
                    )}
                  >
                    {status}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-36 p-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={cn(
                        "flex w-full items-center rounded-md px-3 py-1.5 text-xs transition-colors hover:bg-muted",
                        status === s ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {item.assignee && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-medium">
                    {getInitials(item.assignee)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "history")} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border px-6">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="details"
                  className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Task Details
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2 pt-2 text-xs font-medium data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Task History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="flex-1 overflow-y-auto m-0">
              <div className="px-6 py-5 space-y-6">
                {/* Task Details header */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-3">Task Details</h3>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {item.property && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{item.property}</span>
                      </div>
                    )}
                    {item.dueAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Due {formatDate(item.dueAt)}</span>
                      </div>
                    )}
                    {item.createdAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Created {formatDate(item.createdAt)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RotateCw className="h-4 w-4 shrink-0" />
                      <span>Weekly</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {descriptionHtml && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-2">Description</h3>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                  </div>
                )}

                {!descriptionHtml && item.summary && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                  </div>
                )}

                {/* Links */}
                {sections?.links?.enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Links
                        {linksRequired && (
                          <span className="text-[10px] font-normal text-destructive">(required)</span>
                        )}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {links.map((link, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 group"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-sm text-primary truncate hover:underline"
                          >
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newLink}
                          onChange={(e) => setNewLink(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newLink.trim()) {
                              e.preventDefault();
                              setLinks((prev) => [...prev, newLink.trim()]);
                              setNewLink("");
                            }
                          }}
                          placeholder="Paste a URL and press Enter"
                          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          disabled={!newLink.trim()}
                          onClick={() => {
                            if (newLink.trim()) {
                              setLinks((prev) => [...prev, newLink.trim()]);
                              setNewLink("");
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {sections?.attachments?.enabled && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments
                        {attachmentsRequired && (
                          <span className="text-[10px] font-normal text-destructive">(required)</span>
                        )}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 group"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 text-sm text-foreground truncate">{file}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const name = `Document-${attachments.length + 1}.pdf`;
                          setAttachments((prev) => [...prev, name]);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Attachment
                      </button>
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {sections?.checklist?.enabled && checklistItems.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3">Checklist</h3>
                    <div className="space-y-2">
                      {checklistItems.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            checked={!!checkState[idx]}
                            onChange={(e) =>
                              setCheckState((prev) => ({ ...prev, [idx]: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <span
                            className={cn(
                              "text-sm transition-colors",
                              checkState[idx]
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            )}
                          >
                            {item}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto m-0">
              <div className="px-6 py-5">
                {item.history && item.history.length > 0 ? (
                  <div className="space-y-3">
                    {item.history.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
                        <div className="min-w-0">
                          <p className="text-foreground">
                            <span className="font-medium">{entry.by}</span>{" "}
                            {entry.action}
                          </p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(entry.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No history entries yet.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4">
            {!canComplete && status !== "Done" && (
              <p className="text-xs text-muted-foreground mb-2 text-right">
                {!linksSatisfied && "A link is required. "}
                {!attachmentsSatisfied && "An attachment is required. "}
                {!checklistSatisfied && "All checklist items must be checked."}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!canComplete || status === "Done"}
                onClick={handleMarkComplete}
                className={cn(
                  status === "Done" && "opacity-50"
                )}
              >
                {status === "Done" ? "Completed" : "Mark As Complete"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar icons */}
        <div className="flex flex-col items-center gap-1 border-l border-border px-2 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="h-px w-6 bg-border my-1" />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PenLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
