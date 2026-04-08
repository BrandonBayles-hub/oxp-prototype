"use client";

import { ChevronRight, FileText, Image as ImageIcon, Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BulkOutboundEmailRef, EmailAttachmentRef } from "@/lib/conversations-context";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ConversationBulkEmailCard({
  bulk,
  onClick,
  dense,
  className,
}: {
  bulk: BulkOutboundEmailRef;
  onClick: () => void;
  dense?: boolean;
  className?: string;
}) {
  const by = bulk.sentBy ?? "Staff";
  return (
    <button
      type="button"
      onClick={onClick}
      title="View full bulk email"
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border border-border bg-muted/20 text-left shadow-sm transition-colors",
        "hover:border-primary/35 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dense ? "py-1.5 pl-2 pr-1.5" : "py-2 pl-2.5 pr-2",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border bg-background",
          dense ? "h-7 w-7" : "h-8 w-8"
        )}
      >
        <Users className={cn("text-muted-foreground", dense ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium leading-tight text-foreground",
            dense ? "text-[11px]" : "text-xs"
          )}
        >
          {bulk.subject}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-muted-foreground",
            dense ? "text-[9px] leading-tight" : "text-[10px] leading-tight"
          )}
        >
          <span className="font-medium text-foreground/80">Bulk email</span>
          <span className="text-muted-foreground/70"> · </span>
          {bulk.sentAt}
          {bulk.sentBy ? (
            <>
              <span className="text-muted-foreground/70"> · </span>
              {by}
            </>
          ) : null}
        </p>
      </div>
      <ChevronRight
        className={cn(
          "shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
          dense ? "h-3.5 w-3.5" : "h-4 w-4"
        )}
        aria-hidden
      />
    </button>
  );
}

export function ConversationBulkEmailModal({
  bulk,
  open,
  onOpenChange,
  onAttachmentClick,
}: {
  bulk: BulkOutboundEmailRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttachmentClick: (att: EmailAttachmentRef) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,760px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {bulk ? (
          <>
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                  <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <DialogTitle className="text-base font-semibold leading-snug">{bulk.subject}</DialogTitle>
                  <DialogDescription className="text-left text-[11px] text-muted-foreground">
                    Bulk send · {bulk.recipientSummary} · {bulk.sentAt}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/30 px-6 py-5">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                    {initials(bulk.sentBy ?? "Staff")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{bulk.sentBy ?? "Staff"}</p>
                  <p className="text-[11px] text-muted-foreground">Outbound bulk email</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
                {bulk.body.split("\n").map((line, li) => (
                  <span key={li}>
                    {line}
                    {li < bulk.body.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
              {bulk.emailAttachments && bulk.emailAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {bulk.emailAttachments.map((att, ai) =>
                      att.kind === "image" ? (
                        <button
                          key={`${att.name}-${ai}`}
                          type="button"
                          onClick={() => onAttachmentClick(att)}
                          className="flex w-[min(100%,12rem)] flex-col gap-1.5 rounded-md border border-border bg-card p-2 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex aspect-[4/3] w-full items-center justify-center rounded border border-dashed border-border bg-gradient-to-br from-muted/80 to-muted/40">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/70" aria-hidden />
                          </div>
                          <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                            {att.name}
                          </span>
                        </button>
                      ) : (
                        <button
                          key={`${att.name}-${ai}`}
                          type="button"
                          onClick={() => onAttachmentClick(att)}
                          className="flex max-w-[14rem] items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                            {att.name}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
              {bulk.emailSignature?.trim() && (
                <div className="border-t border-border pt-4">
                  <div className="flex gap-3">
                    <Avatar className="mt-0.5 h-9 w-9 shrink-0 border border-border">
                      <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                        {initials(bulk.sentBy ?? "Staff")}
                      </AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                      {bulk.emailSignature}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
